import express, { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import { doubleCsrf } from 'csrf-csrf';
import path from 'path';
import { Runtime } from './core/runtime';
import { ViewData } from './core/types';
import { IndexComponent } from './core/system/components/index.component';

// Extend express-session types
declare module 'express-session' {
  interface SessionData {
    flash?: {
      type: string;
      message: string;
    };
  }
}

const app = express();
const port = process.env.PORT || 3000;

// Initialize our framework runtime
const runtime = new Runtime(path.join(__dirname, 'templates'));

// Initialize system components
const indexComponent = new IndexComponent(runtime);
runtime.registerComponent('system:index', indexComponent);

// Middleware setup
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'development-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

const { generateToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => process.env.SESSION_SECRET || 'development-secret',
  cookieName: 'csrf-token',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
});

app.use(doubleCsrfProtection);

// Set up EJS as view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'templates'));

// Serve static files
app.use(express.static('public'));

// System routes
app.get('/docs', async (req: Request, res: Response) => {
  await runtime.handleAction(indexComponent, req, res);
});

// Main route
app.get('/', async (req: Request, res: Response) => {
  const viewData: ViewData = {
    title: 'cogniframe',
    state: indexComponent.getState(),
    csrfToken: generateToken(req, res),
    flash: req.session.flash
  };
  
  // Clear flash message after use
  delete req.session.flash;
  
  const html = await runtime.render(indexComponent, viewData);
  res.send(html);
});

// Error handling middleware
app.use(async (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err.name === 'UnauthorizedError') {
    const html = await runtime.renderTemplate('error', {
      title: 'Unauthorized',
      message: 'You are not authorized to view this page',
      csrfToken: generateToken(req, res),
      state: null
    });
    res.status(401).send(html);
  } else {
    next(err);
  }
});

// Default error handler
app.use(async (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  const html = await runtime.renderTemplate('error', {
    title: 'Error',
    message: 'Something went wrong!',
    csrfToken: generateToken(req, res),
    state: null
  });
  res.status(500).send(html);
});

app.listen(port, () => {
  console.log(`cogniframe server running at http://localhost:${port}`);
}); 