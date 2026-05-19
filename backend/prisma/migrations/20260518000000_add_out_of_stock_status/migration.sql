-- Add out_of_stock value to ItemStatus enum
ALTER TYPE "ItemStatus" ADD VALUE IF NOT EXISTS 'out_of_stock';
