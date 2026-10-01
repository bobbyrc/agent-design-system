const $ = (selector) => document.querySelector(selector);
const scenario = new URLSearchParams(location.search).get("scenario");
const store = { loans: [], events: [], pending: false };
window.equipmentStore = () => structuredClone(store);
const state = {
  scope: "overdue",
  query: "",
  selected: null,
  checks: {},
  failedOnce: false,
  loading: true,
  loadError: false,
  lastFocus: null,
  queueScroll: 0,
  focusedControl: null,
  taskActive: false,
};
let clock;
const narrow = matchMedia("(max-width: 899px)");
const accessories = [
  ["recorder", "Recorder", "Portable stereo"],
  ["microphone", "Microphone", "With windscreen"],
  ["cables", "Cables", "USB + audio"],
];
const loanWord = (count) => count === 1 ? "loan" : "loans";
history.replaceState({ ...history.state, equipmentView: "queue" }, "");
const detail = $('[data-testid="detail"]');
const announcer = $("#announcer");
const icons = {
  kit: '<svg viewBox="0 0 24 30" aria-hidden="true"><rect x="4" y="2" width="16" height="26" rx="3"/><rect x="7" y="6" width="10" height="7" rx="1"/><circle cx="12" cy="20" r="3"/><path d="M8 25h8"/></svg>',
  clock:
    '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6"/><path d="M8 4v4l2.5 1.5"/></svg>',
};
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const date = (value, full = false) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: full ? "long" : "short",
    ...(full ? { year: "numeric" } : {}),
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
const daysLate = (loan) =>
  Math.max(
    0,
    Math.floor(
      (Date.parse(clock.slice(0, 10)) - Date.parse(loan.dueDate)) / 86400000,
    ),
  );
const overdue = (loan) => loan.status !== "returned" && daysLate(loan) > 0;
const loanStatus = (loan) =>
  loan.status === "returned"
    ? "Returned"
    : daysLate(loan)
      ? `${daysLate(loan)} ${daysLate(loan) === 1 ? "day" : "days"} overdue`
      : "On loan";
const selectedLoan = () =>
  store.loans.find((loan) => loan.id === state.selected);
const announce = (text) => {
  announcer.textContent = text;
};

function filteredLoans() {
  const query = state.query.trim().toLocaleLowerCase("en-GB");
  return store.loans.filter(
    (loan) =>
      (state.scope === "all" || overdue(loan)) &&
      (!query ||
        `${loan.kit} ${loan.borrower}`
          .toLocaleLowerCase("en-GB")
          .includes(query)),
  );
}

function renderQueue() {
  if (state.loading || state.loadError) return;
  const loans = filteredLoans();
  const overdueCount = store.loans.filter(overdue).length;
  $("#overdue-total").textContent = overdueCount;
  $("#all-total").textContent = store.loans.length;
  $("#queue-title").textContent =
    state.scope === "overdue" ? "Overdue loans" : "All loans";
  $("#queue-summary").innerHTML =
    `<span data-testid="queue-count">${loans.length}</span> ${state.query.trim() ? `matching ${loans.length === 1 ? "loan" : "loans"}` : state.scope === "overdue" ? "awaiting return" : `loan ${loans.length === 1 ? "record" : "records"}`}`;
  $('[data-testid="scope-overdue"]').setAttribute(
    "aria-pressed",
    String(state.scope === "overdue"),
  );
  $('[data-testid="scope-all"]').setAttribute(
    "aria-pressed",
    String(state.scope === "all"),
  );
  const content = $("#queue-content");
  content.setAttribute("aria-busy", String(state.loading));
  if (state.loading) return;
  if (!loans.length) {
    const isSearch = Boolean(state.query.trim());
    const title = isSearch ? "No matching loans" : "All caught up";
    const message = isSearch
      ? "Try another kit or borrower, or clear your search to see this queue."
      : "There are no overdue loans. Your current loans are still available in All loans.";
    content.innerHTML = `<div class="empty-state"><div class="empty-symbol" aria-hidden="true">${isSearch ? "⌕" : "✓"}</div><h3>${title}</h3><p>${message}</p><button class="secondary-button" id="empty-action" type="button" ${store.pending ? "disabled" : ""}>${isSearch ? "Clear search" : "View all loans"}</button></div>`;
    $("#empty-action").addEventListener("click", () => {
      if (store.pending || state.loading || state.loadError) return;
      state.taskActive = false;
      if (isSearch) {
        state.query = "";
        $('[data-testid="search"]').value = "";
        renderQueue();
        $('[data-testid="search"]').focus();
      } else changeScope("all");
    });
    return;
  }
  content.innerHTML = `<table class="loans-table"><caption class="sr-only">${state.scope === "overdue" ? "Overdue loans" : "All loans"} — choose a kit to inspect its return</caption><thead><tr><th scope="col">KIT / BORROWER</th><th scope="col">DUE</th><th scope="col">STATUS</th></tr></thead><tbody>${loans.map((loan) => `<tr class="${loan.id === state.selected ? "selected" : ""}"><td><button class="loan-open" type="button" data-testid="loan-${escape(loan.id)}" data-loan="${escape(loan.id)}" ${store.pending ? "disabled" : ""} ${loan.id === state.selected ? 'aria-current="true"' : ""}><span class="kit-icon" aria-hidden="true">${icons.kit}</span><span class="loan-identity"><span class="kit-name">${escape(loan.kit)}</span><span class="borrower">${escape(loan.borrower)}</span></span></button></td><td class="date-cell"><time datetime="${loan.dueDate}">${date(loan.dueDate)}</time></td><td><span class="loan-state ${loan.status === "returned" ? "returned" : !overdue(loan) ? "current" : ""}"><span class="state-dot" aria-hidden="true"></span>${loanStatus(loan)}</span></td></tr>`).join("")}</tbody></table>`;
  content
    .querySelectorAll("[data-loan]")
    .forEach((button) =>
      button.addEventListener("click", () => openLoan(button.dataset.loan)),
    );
}

function changeScope(scope) {
  if (store.pending || state.loading || state.loadError) return;
  state.taskActive = false;
  state.scope = scope;
  renderQueue();
  announce(
    `${filteredLoans().length} ${scope === "overdue" ? `overdue ${loanWord(filteredLoans().length)}` : `loan ${filteredLoans().length === 1 ? "record" : "records"}`} shown.`,
  );
}

function openLoan(id) {
  if (store.pending || state.loading || state.loadError) return;
  state.taskActive = false;
  const hadRowFocus = document.activeElement?.dataset.loan === id;
  state.lastFocus = `loan-${id}`;
  state.queueScroll = window.scrollY;
  state.selected = id;
  renderQueue();
  renderDetail();
  if (narrow.matches) {
    document.body.dataset.view = "detail";
    history.pushState({ ...history.state, equipmentView: "detail", selected: id }, "");
    window.scrollTo(0, 0);
    $("#detail-title").focus({ preventScroll: true });
  } else if (hadRowFocus) {
    $(`[data-testid="loan-${id}"]`).focus({ preventScroll: true });
  }
}

function backToQueue(fromHistory = false) {
  if (store.pending) return;
  state.taskActive = false;
  if (!fromHistory && narrow.matches && history.state?.equipmentView === "detail") {
    history.back();
    return;
  }
  document.body.dataset.view = "queue";
  if (narrow.matches) window.scrollTo(0, state.queueScroll);
  const target = state.lastFocus && $(`[data-testid="${state.lastFocus}"]`);
  (target || $('[data-testid="search"]')).focus({ preventScroll: true });
}

window.addEventListener("popstate", () => {
  if (!history.state?.equipmentView) return;
  if (store.pending) {
    // A browser Back gesture must not leave the form during its save lock.
    history.go(1);
    return;
  }
  if (narrow.matches && history.state?.equipmentView === "detail" &&
      store.loans.some((loan) => loan.id === history.state.selected)) {
    state.selected = history.state.selected;
    renderQueue();
    renderDetail();
    document.body.dataset.view = "detail";
    window.scrollTo(0, 0);
    $("#detail-title").focus({ preventScroll: true });
  } else backToQueue(true);
});
$(".skip-link").addEventListener("click", (event) => {
  // Focus navigation must not create a fragment entry in the loan-view history.
  event.preventDefault();
  $("#workspace").focus();
  $("#workspace").scrollIntoView();
});
document.addEventListener("focusin", (event) => {
  if (!store.pending && event.target.closest(".queue-panel")) state.taskActive = false;
  if (event.target !== document.body) state.focusedControl = event.target;
});
narrow.addEventListener("change", () => {
  const active = document.activeElement === document.body ? state.focusedControl : document.activeElement;
  const wasInDetail = detail.contains(active);
  const status = $('[data-testid="return-status"]');
  // Preserve only the current task, not an outcome left behind while using the queue.
  if (narrow.matches && state.taskActive) {
    document.body.dataset.view = "detail";
    const entry = { ...history.state, equipmentView: "detail", selected: state.selected };
    if (history.state?.equipmentView === "detail") history.replaceState(entry, "");
    else history.pushState(entry, "");
    const target = status.classList.contains("error")
      ? $('[data-testid="return-submit"]') : status;
    if (target === status) target.tabIndex = -1;
    target.focus();
    return;
  }
  document.body.dataset.view = "queue";
  // A layout-driven queue is also the current navigation destination. Otherwise
  // the next detail pushes above an obsolete detail entry and Back opens it.
  history.replaceState({ ...history.state, equipmentView: "queue", selected: null }, "");
  if (narrow.matches && wasInDetail) backToQueue(true);
  if (!narrow.matches && active?.matches(".back-button, #success-back"))
    $("#detail-title")?.focus({ preventScroll: true });
});

function renderDetail() {
  const loan = selectedLoan();
  if (!loan) {
    detail.innerHTML =
      '<div class="detail-placeholder"><h2 id="detail-title">Select a loan</h2><p>Open a kit to check its contents and record a return.</p></div>';
    return;
  }
  const checked = (state.checks[loan.id] ||= {
    recorder: false,
    microphone: false,
    cables: false,
  });
  const initials = loan.borrower
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
  const returned = loan.status === "returned";
  detail.innerHTML = `<button class="back-button" data-testid="back-to-queue" type="button"><span aria-hidden="true">←</span> Back to queue</button><div class="detail-top"><p class="detail-kicker">${returned ? "LOAN COMPLETE" : "RETURN CHECK"}</p><span class="reference">${escape(loan.reference)}</span></div><h2 id="detail-title" class="detail-title" tabindex="-1">${escape(loan.kit)}</h2><span class="detail-state ${returned ? "returned" : !overdue(loan) ? "current" : ""}">${icons.clock}${loanStatus(loan)}</span><div class="borrower-block"><span class="avatar" aria-hidden="true">${escape(initials)}</span><div><span>Borrower</span><p>${escape(loan.borrower)}</p></div></div><dl class="loan-metadata"><div><dt>Due date</dt><dd><time datetime="${loan.dueDate}">${date(loan.dueDate, true)}</time></dd></div><div><dt>Checked out</dt><dd><time datetime="${loan.checkedOut}">${date(loan.checkedOut)}</time></dd></div></dl>${
    returned
      ? `<div class="complete-illustration" aria-hidden="true">✓</div><div class="success-copy"><h3>Ready for the next loan</h3><p>All three accessories were checked and this kit is now available in the mock inventory.</p></div><button class="secondary-button" id="success-back" type="button">Back to queue</button>`
      : `<form class="return-form"><fieldset><legend>Check kit contents</legend><p class="check-description">Confirm all three items are present before returning.</p>${accessories
          .map(
            ([key, label, description]) =>
              `<label class="check-row"><input type="checkbox" data-testid="check-${key}" name="${key}" ${checked[key] ? "checked" : ""} ${loan.missingAccessory === key ? 'disabled aria-describedby="missing-accessory"' : ""}><span><span>${label}</span><small>${description}</small></span></label>`,
          )
          .join(
            "",
          )}</fieldset>${loan.missingAccessory ? `<p class="missing-note" id="missing-accessory"><strong>${escape(accessories.find(([key]) => key === loan.missingAccessory)?.[1] || "Accessory")} reported missing</strong>A complete return cannot be recorded. Keep the loan open and contact your equipment coordinator outside this demo. Exception recording is not supported here.</p>` : ""}<button class="return-submit" data-testid="return-submit" type="submit" disabled><span>Mark returned</span><span class="button-arrow" aria-hidden="true">→</span></button><p class="return-note">${loan.missingAccessory ? "Return is unavailable until the missing accessory is recovered." : "The kit becomes available after the return is saved. Demo inventory only."}</p></form>`
  }<p class="return-status ${returned ? "success" : ""}" data-testid="return-status" role="status" aria-live="polite" aria-atomic="true">${returned ? `Return recorded. ${escape(loan.kit)} is now available.` : ""}</p>`;
  $('[data-testid="back-to-queue"]').addEventListener("click", () => backToQueue());
  if (returned) {
    $("#success-back").addEventListener("click", () => backToQueue());
    return;
  }
  detail.querySelectorAll('input[type="checkbox"]').forEach((input) =>
    input.addEventListener("change", () => {
      checked[input.name] = input.checked;
      updateSubmit();
    }),
  );
  $(".return-form").addEventListener("submit", saveReturn);
  updateSubmit();
}

function updateSubmit() {
  const loan = selectedLoan();
  const button = $('[data-testid="return-submit"]');
  if (!button) return;
  button.disabled =
    store.pending ||
    Boolean(loan.missingAccessory) ||
    !Object.values(state.checks[loan.id]).every(Boolean);
}

function lockQueue(pending) {
  const locked = pending || state.loading || state.loadError;
  $('[data-testid="search"]').disabled = locked;
  $('[data-testid="scope-overdue"]').disabled = locked;
  $('[data-testid="scope-all"]').disabled = locked;
  document.querySelectorAll("[data-loan]").forEach((button) => {
    button.disabled = pending;
  });
  const emptyAction = $("#empty-action");
  if (emptyAction) emptyAction.disabled = locked;
  const back = $('[data-testid="back-to-queue"]');
  if (back) back.disabled = pending;
}

async function saveReturn(event) {
  event.preventDefault();
  const loan = selectedLoan();
  if (
    store.pending ||
    loan.status === "returned" ||
    loan.missingAccessory ||
    !Object.values(state.checks[loan.id]).every(Boolean)
  )
    return;
  state.taskActive = true;
  store.pending = true;
  lockQueue(true);
  const button = $('[data-testid="return-submit"]');
  const status = $('[data-testid="return-status"]');
  $(".return-form fieldset").disabled = true;
  button.disabled = true;
  button.dataset.pending = "true";
  button.firstElementChild.textContent = "Saving return…";
  status.className = "return-status";
  status.textContent = "Saving return. Please wait.";
  detail.setAttribute("aria-busy", "true");
  await new Promise((resolve) => setTimeout(resolve, 650));
  if (scenario === "save-failure" && !state.failedOnce) {
    state.failedOnce = true;
    store.pending = false;
    detail.setAttribute("aria-busy", "false");
    $(".return-form fieldset").disabled = false;
    button.dataset.pending = "false";
    button.firstElementChild.textContent = "Retry return";
    status.className = "return-status error";
    status.textContent =
      "Could not save the return. Your checks are kept. Try again.";
    lockQueue(false);
    updateSubmit();
    button.focus({ preventScroll: true });
    return;
  }
  loan.status = "returned";
  store.events.push({ type: "returned", loanId: loan.id, at: clock });
  store.pending = false;
  detail.setAttribute("aria-busy", "false");
  renderQueue();
  renderDetail();
  lockQueue(false);
  announce(
    `Return recorded. ${loan.kit} is now available. ${store.loans.filter(overdue).length} overdue ${loanWord(store.loans.filter(overdue).length)} remain.`,
  );
  const confirmation = $('[data-testid="return-status"]');
  confirmation.tabIndex = -1;
  confirmation.focus({ preventScroll: true });
}

$('[data-testid="search"]').addEventListener("input", (event) => {
  if (store.pending || state.loading || state.loadError) return;
  state.taskActive = false;
  state.query = event.target.value;
  renderQueue();
  announce(`${filteredLoans().length} matching ${loanWord(filteredLoans().length)}.`);
});
$('[data-testid="scope-overdue"]').addEventListener("click", () =>
  changeScope("overdue"),
);
$('[data-testid="scope-all"]').addEventListener("click", () =>
  changeScope("all"),
);

async function initialize() {
  try {
    lockQueue(false);
    const response = await fetch("./fixtures.json");
    if (!response.ok) throw new Error("Fixture unavailable");
    const fixture = await response.json();
    clock = fixture.clock;
    store.loans = structuredClone(fixture.loans);
    if (scenario === "empty")
      store.loans.forEach((loan) => {
        loan.dueDate = "2026-10-05";
      });
    if (scenario === "long-content")
      Object.assign(store.loans[0], fixture.longContent);
    if (scenario === "loading")
      await new Promise((resolve) => setTimeout(resolve, 1200));
    state.loading = false;
    state.selected = scenario === "empty" || narrow.matches ? null : "kit-12";
    renderQueue();
    renderDetail();
    lockQueue(false);
    announce(`${store.loans.filter(overdue).length} overdue ${loanWord(store.loans.filter(overdue).length)} loaded.`);
  } catch {
    state.loading = false;
    state.loadError = true;
    $("#queue-summary").textContent = "Loan counts unavailable";
    lockQueue(false);
    $("#queue-content").setAttribute("aria-busy", "false");
    $("#queue-content").innerHTML =
      '<div class="empty-state"><h3>Could not load the demo</h3><p>Serve this folder through the local teaching runner, then reload to try again.</p></div>';
    announce("Could not load the teaching fixture.");
  }
}
initialize();
