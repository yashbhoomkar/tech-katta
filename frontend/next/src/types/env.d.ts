// The build's environment variables (Vite exposes VITE_* as import.meta.env).
interface ImportMetaEnv {
  /** the content API's base URL (default https://tech-api.katta.cc) */
  readonly VITE_API_BASE?: string;
  /** "none" leaves out the host's analytics script (builds for hosts other than Vercel) */
  readonly VITE_HOST_ANALYTICS?: string;
  readonly BASE_URL: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
