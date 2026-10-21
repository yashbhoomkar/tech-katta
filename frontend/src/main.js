import "./style.css";

const root = document.querySelector("#root");

root.innerHTML = `
  <main class="shell">
    <nav class="nav">
      <a class="brand" href="/" aria-label="Tech Katta home">
        <span class="brand-mark">tk</span>
        <span>tech<span class="muted">.katta</span></span>
      </a>
      <span class="status"><span class="pulse"></span> Deployment smoke test</span>
    </nav>

    <section class="hero">
      <div class="eyebrow"><span class="eyebrow-line"></span> FRESH START · BUILD 001</div>
      <h1>Welcome to the<br /><span>new Tech Katta.</span></h1>
      <p class="intro">A minimal frontend deployed to verify that the production build and hosting pipeline still work after the repository reset.</p>

      <div class="result-card">
        <div class="result-icon" aria-hidden="true">✓</div>
        <div class="result-copy">
          <div class="result-title">Frontend is running</div>
          <p id="result-detail">JavaScript loaded successfully in your browser.</p>
        </div>
        <span class="tag">CLIENT OK</span>
      </div>

      <div class="actions">
        <button id="test-button" type="button">Run browser test <span aria-hidden="true">↗</span></button>
        <span id="test-output" role="status">Ready to test</span>
      </div>
    </section>

    <section class="checks" aria-label="Deployment checks">
      <article class="check">
        <span class="check-number">01</span>
        <div><h2>Static assets</h2><p>HTML, CSS and JavaScript are loaded.</p></div>
        <span class="check-state">READY</span>
      </article>
      <article class="check">
        <span class="check-number">02</span>
        <div><h2>Production build</h2><p>Vite compiles the app into deployable assets.</p></div>
        <span class="check-state">VERIFY ON HOST</span>
      </article>
      <article class="check">
        <span class="check-number">03</span>
        <div><h2>Custom domain</h2><p>Open this page through tech.katta.cc to verify DNS and TLS too.</p></div>
        <span class="check-state" id="domain-state">PENDING</span>
      </article>
    </section>

    <footer><span>TECH KATTA <span class="muted">/ RESET TEST</span></span><span id="timestamp">Session starting…</span></footer>
  </main>
`;

const timestamp = document.querySelector("#timestamp");
timestamp.textContent = new Date().toLocaleString();

const host = window.location.hostname;
const domainState = document.querySelector("#domain-state");
domainState.textContent = host === "tech.katta.cc" ? "CUSTOM DOMAIN OK" : "PREVIEW / HOST";
domainState.classList.toggle("good", host === "tech.katta.cc");

document.querySelector("#test-button").addEventListener("click", () => {
  const output = document.querySelector("#test-output");
  const detail = document.querySelector("#result-detail");
  output.textContent = "Passed · " + new Date().toLocaleTimeString();
  detail.textContent = "Button interaction and client-side JavaScript both work.";
  document.querySelector(".result-card").classList.add("tested");
});
