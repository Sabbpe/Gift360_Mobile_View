/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** UPI intent status-poll interval in ms (default 2000, min 500). */
  readonly VITE_UPI_POLL_INTERVAL_MS?: string;
}

declare module "*.png" { const src: string; export default src; }
declare module "*.jpg" { const src: string; export default src; }
declare module "*.jpeg" { const src: string; export default src; }
declare module "*.svg" { const src: string; export default src; }
declare module "*.gif" { const src: string; export default src; }
declare module "*.webp" { const src: string; export default src; }
declare module "*.avif" { const src: string; export default src; }
