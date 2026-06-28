import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  // Security headers
  app.use(helmet({
    contentSecurityPolicy: false, // handled by Vercel on the frontend
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  // Explicit request body-size limits — cap payloads to a sane size.
  app.use(json({ limit: '512kb' }));
  app.use(urlencoded({ extended: true, limit: '512kb' }));

  // CORS — explicit allowlist + pattern fallback for Vercel previews
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(s => s.trim()) ?? [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://oriafintech.com',
    'https://www.oriafintech.com',
  ];
  // Vercel preview deployments are only auto-allowed outside production, so a
  // hostile *.vercel.app site can't call the prod API. In production, set
  // ALLOWED_ORIGINS explicitly to the known frontend origins.
  const allowVercelPreviews = process.env.NODE_ENV !== 'production';
  app.enableCors({
    origin: (origin, cb) => {
      // Allow same-origin / server-to-server (no Origin header)
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      if (/\.oriafintech\.com$/.test(origin)) return cb(null, true);
      if (allowVercelPreviews && /\.vercel\.app$/.test(origin)) return cb(null, true);
      cb(new Error(`Origin ${origin} not allowed`), false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-secret'],
    // Auth uses bearer tokens in the Authorization header, not cookies, so
    // credentialed CORS is unnecessary and is disabled to remove CSRF surface.
    credentials: false,
  });

  // Global prefix & versioning
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // Global exception filter — sanitizes all error responses, no stack traces
  app.useGlobalFilters(new AllExceptionsFilter());

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger docs — disabled in production unless explicitly enabled, so a
  // missing NODE_ENV can't accidentally publish the full API surface map.
  const swaggerEnabled =
    process.env.ENABLE_SWAGGER === 'true' ||
    (process.env.NODE_ENV !== 'production' && process.env.ENABLE_SWAGGER !== 'false');
  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('ORIA API')
      .setDescription('Personal Financial Intelligence Platform - REST API')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Authentication endpoints')
      .addTag('dashboard', 'Dashboard & summaries')
      .addTag('accounts', 'Financial accounts')
      .addTag('transactions', 'Transactions & movements')
      .addTag('patrimony', 'Assets, liabilities & net worth')
      .addTag('goals', 'Financial goals')
      .addTag('ai', 'AI insights & chat')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 ORIA API running on http://localhost:${port}/api/v1`);
  console.log(`📚 Swagger docs at http://localhost:${port}/docs`);
}

bootstrap();
