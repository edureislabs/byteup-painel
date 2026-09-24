import { PrismaClient } from '@prisma/client'

declare module '@prisma/client' {
  interface PrismaClient {
    gameTransaction: {
      findMany(args?: any): Promise<any[]>
      create(args?: any): Promise<any>
      findUnique(args?: any): Promise<any>
      findFirst(args?: any): Promise<any>
      count(args?: any): Promise<number>
      update(args?: any): Promise<any>
      delete(args?: any): Promise<any>
    }
  }
}