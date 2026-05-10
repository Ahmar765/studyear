import { ACU_PACKAGES } from '@/data/acu-packages';

/** Rule-of-thumb customer £ value per ACU using the Entry pack (£5 / 500 ACU). */
export const GBP_PER_ACU_ENTRY_RATE =
  ACU_PACKAGES.ENTRY.pricePence / 100 / ACU_PACKAGES.ENTRY.totalACUs;
