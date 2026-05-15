import pino from 'pino'
import { config } from './config.js'

const transport = config.logFile
  ? pino.transport({
      targets: [
        { target: 'pino-pretty', level: config.logLevel, options: { colorize: true } },
        { target: 'pino/file', level: config.logLevel, options: { destination: config.logFile } },
      ],
    })
  : pino.transport({
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'SYS:HH:MM:ss' },
    })

export const logger = pino({ level: config.logLevel }, transport)
