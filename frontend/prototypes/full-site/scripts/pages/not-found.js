// A wrong or old link: say so plainly and offer the ways back (search, home, learn).
export const title = () => "Page not found";
export const render = () => `
<div class="content nf">
  <p class="mono">404</p><h1>This page isn't here.</h1>
  <p>The link may be old, or the lesson may have moved. Search for it, or start from Home.</p>
  <div class="row-gap"><button class="btn primary" type="button" data-cmdk>Search</button><a class="btn" href="#/home">Home</a><a class="btn" href="#/learn">Learn</a></div>
</div>`;
