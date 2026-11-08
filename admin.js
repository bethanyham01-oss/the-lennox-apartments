(() => {
  const cfg = window.LENNOX_SUPABASE || {};
  const loginPanel = document.getElementById("login-panel");
  const dashboard = document.getElementById("dashboard");
  const loginForm = document.getElementById("login-form");
  const loginMessage = document.getElementById("login-message");
  const dashboardMessage = document.getElementById("dashboard-message");
  const list = document.getElementById("booking-list");
  const client = (cfg.url && cfg.anonKey && window.supabase?.createClient)
    ? window.supabase.createClient(cfg.url, cfg.anonKey) : null;

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  }[ch]));
  const dateLabel = (value) => value ? new Date(`${value}T12:00:00`).toLocaleDateString() : "—";
  const showMessage = (el, msg, isError=true) => {
    el.textContent = msg;
    el.style.color = isError ? "#a13d32" : "#47734e";
  };

  if (!client) {
    loginMessage.textContent = "Admin dashboard setup is incomplete. Add your Supabase Project URL and anon/public key to config.js, then run the supplied setup.sql in Supabase.";
    loginForm.querySelector("button").disabled = true;
    return;
  }

  async function renderSession(session) {
    if (!session) {
      dashboard.hidden = true;
      loginPanel.hidden = false;
      return;
    }
    loginPanel.hidden = true;
    dashboard.hidden = false;
    document.getElementById("admin-email").textContent = session.user.email || "";
    await loadBookings();
  }

  async function loadBookings() {
    list.innerHTML = '<div class="empty">Loading booking requests…</div>';
    const { data, error } = await client.from("bookings").select("*").order("created_at", {ascending:false});
    if (error) {
      list.innerHTML = '<div class="empty">Could not load bookings. Check that this signed-in account has administrator access and the SQL setup was completed.</div>';
      showMessage(dashboardMessage, error.message);
      return;
    }
    dashboardMessage.textContent = "";
    const bookings = data || [];
    document.getElementById("total-count").textContent = bookings.length;
    document.getElementById("pending-count").textContent = bookings.filter(b => ["new","contacted"].includes(b.status)).length;
    document.getElementById("confirmed-count").textContent = bookings.filter(b => b.status === "confirmed").length;
    document.getElementById("paid-count").textContent = bookings.filter(b => b.payment_status === "paid").length;
    const filter = document.getElementById("status-filter").value;
    const visible = filter === "all" ? bookings : bookings.filter(b => b.status === filter);
    if (!visible.length) {
      list.innerHTML = '<div class="empty">No booking requests found for this filter.</div>';
      return;
    }
    list.innerHTML = visible.map(b => `
      <article class="booking-card" data-id="${escapeHtml(b.id)}">
        <div class="booking-top">
          <div><h3>${escapeHtml(b.guest_name)}</h3><p>${escapeHtml(b.guest_email || "No email provided")} · Received ${escapeHtml(new Date(b.created_at).toLocaleString())}</p></div>
          <span class="tag">${escapeHtml(b.status)}</span>
        </div>
        <div class="booking-meta">
          <div><span>Check-in</span><strong>${escapeHtml(dateLabel(b.check_in))}</strong></div>
          <div><span>Check-out</span><strong>${escapeHtml(dateLabel(b.check_out))}</strong></div>
          <div><span>Guests</span><strong>${escapeHtml(b.guests)}</strong></div>
          <div><span>Apartment</span><strong>${escapeHtml(b.apartment_type || "Not specified")}</strong></div>
        </div>
        ${b.guest_message ? `<p class="muted"><b>Guest message:</b> ${escapeHtml(b.guest_message)}</p>` : ""}
        <form class="booking-controls" data-booking-form="${escapeHtml(b.id)}">
          <label>Booking status<select name="status">
            ${["new","contacted","confirmed","cancelled"].map(s=>`<option value="${s}" ${b.status===s?"selected":""}>${s}</option>`).join("")}
          </select></label>
          <label>Payment status<select name="payment_status">
            ${["unpaid","paid","refunded","failed"].map(s=>`<option value="${s}" ${b.payment_status===s?"selected":""}>${s}</option>`).join("")}
          </select></label>
          <label>Amount (GHS)<input name="amount_ghs" type="number" min="0" step="0.01" value="${b.amount_ghs ?? ""}" placeholder="e.g. 1200"></label>
          <label>Internal note<input name="admin_notes" type="text" value="${escapeHtml(b.admin_notes || "")}" placeholder="Private team note"></label>
          <button class="primary" type="submit">Save changes</button>
        </form>
        <button class="secondary delete-booking" type="button" data-delete="${escapeHtml(b.id)}" style="margin-top:10px">Delete request</button>
      </article>`).join("");
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = loginForm.querySelector("button");
    button.disabled = true; loginMessage.textContent = "Signing in…";
    const form = new FormData(loginForm);
    const { error } = await client.auth.signInWithPassword({
      email: String(form.get("email") || "").trim(),
      password: String(form.get("password") || "")
    });
    button.disabled = false;
    if (error) { showMessage(loginMessage, error.message); return; }
    loginMessage.textContent = "";
  });

  document.getElementById("signout").addEventListener("click", async () => {
    await client.auth.signOut();
  });
  document.getElementById("refresh").addEventListener("click", loadBookings);
  document.getElementById("status-filter").addEventListener("change", loadBookings);

  list.addEventListener("submit", async (event) => {
    const form = event.target.closest("[data-booking-form]");
    if (!form) return;
    event.preventDefault();
    const formData = new FormData(form);
    const rawAmount = String(formData.get("amount_ghs") || "").trim();
    const update = {
      status: formData.get("status"),
      payment_status: formData.get("payment_status"),
      amount_ghs: rawAmount === "" ? null : Number(rawAmount),
      admin_notes: String(formData.get("admin_notes") || "").trim() || null
    };
    if (update.amount_ghs !== null && (!Number.isFinite(update.amount_ghs) || update.amount_ghs < 0)) {
      showMessage(dashboardMessage, "Enter a valid non-negative amount."); return;
    }
    const { error } = await client.from("bookings").update(update).eq("id", form.dataset.bookingForm);
    if (error) { showMessage(dashboardMessage, error.message); return; }
    showMessage(dashboardMessage, "Booking updated.", false);
    await loadBookings();
  });

  list.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-delete]");
    if (!button) return;
    if (!window.confirm("Delete this booking request permanently?")) return;
    const { error } = await client.from("bookings").delete().eq("id", button.dataset.delete);
    if (error) { showMessage(dashboardMessage, error.message); return; }
    showMessage(dashboardMessage, "Booking request deleted.", false);
    await loadBookings();
  });

  client.auth.onAuthStateChange((_event, session) => {
    // Defer UI work out of the auth callback to avoid blocking auth state transitions.
    Promise.resolve().then(() => renderSession(session));
  });
  client.auth.getSession().then(({data}) => renderSession(data.session));
})();
