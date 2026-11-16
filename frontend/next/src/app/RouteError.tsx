import { isRouteErrorResponse, useRouteError } from "react-router-dom";
import { StateMessage, Button, ButtonLink } from "@/components/ui";
import { paths } from "@/content/sections";
import s from "@/pages/pages.module.css";

// The app's last line of defence: any error a page throws while rendering lands here (router errorElement), not on a
// blank screen. A page whose code cannot be fetched (after a new release, the old chunks are gone) asks for a reload.
// Errors are logged to the console; sending them to the API needs a "client_error" event in
// backend/src/auth/events.js first (it accepts only the events it lists).

/** true when the error is a page chunk that could not be loaded (usually a new release while this tab was open) */
export function isChunkError(err: unknown): boolean {
  const msg = err instanceof Error ? `${err.name} ${err.message}` : String(err);
  return /dynamically imported module|Importing a module script failed|ChunkLoadError|Loading chunk \S+ failed/i.test(msg);
}

export function RouteError() {
  const err = useRouteError();
  console.error("[tech-katta] page error", err);
  const reload = () => window.location.reload();
  if (isRouteErrorResponse(err) && err.status === 404) {
    return <div className={s.page}><StateMessage title="This page isn't here." scene="missing" action={<ButtonLink to={paths.home}>Home</ButtonLink>} /></div>;
  }
  if (isChunkError(err)) {
    return (
      <div className={s.page}>
        <StateMessage title="A new version of the site is out." scene="busy" action={<Button variant="primary" onClick={reload}>Reload</Button>}>
          This page changed since you opened the tab. Reload to get the new one; your progress is kept.
        </StateMessage>
      </div>
    );
  }
  return (
    <div className={s.page}>
      <StateMessage title="Something broke on this page." scene="broken" action={<><Button variant="primary" onClick={reload}>Reload</Button> <ButtonLink to={paths.home}>Home</ButtonLink></>}>
        Your progress is kept on this device. If it happens again, tell us what you were doing.
      </StateMessage>
    </div>
  );
}
