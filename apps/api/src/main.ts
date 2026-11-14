import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { WsAdapter } from '@nestjs/platform-ws';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useWebSocketAdapter(new WsAdapter(app));
  // local development and the local network only (the demo laptop and phones on the same Wi-Fi)
  const LOCAL =
    /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/;
  // plus the hosted web app(s): CORS_ORIGINS="https://app.example.com,https://other.example.com"
  const EXTRA = (process.env.CORS_ORIGINS ?? '').split(',').map((o) => o.trim().replace(/\/$/, '')).filter(Boolean);
  app.enableCors({ origin: (origin, cb) => cb(null, !origin || LOCAL.test(origin) || EXTRA.includes(origin)) });
  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port, '0.0.0.0');
  console.log(`API on http://localhost:${port}  ws://localhost:${port}/ws`);
}
bootstrap();
