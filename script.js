const menuButton = document.querySelector(".menu-toggle");
const navigation = document.querySelector(".main-nav");
if (menuButton && navigation) {
  menuButton.addEventListener("click", () => {
    const isOpen = navigation.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(isOpen));
    menuButton.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
    menuButton.textContent = isOpen ? "×" : "☰";
  });
  navigation.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
    navigation.classList.remove("open");
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "Open navigation");
    menuButton.textContent = "☰";
  }));
}
const year = document.getElementById("year");
if (year) year.textContent = new Date().getFullYear();

const bookingForm = document.getElementById("booking-form");
const checkIn = bookingForm?.elements.namedItem("checkin");
const checkOut = bookingForm?.elements.namedItem("checkout");
const errorBox = document.getElementById("form-error");
if (checkIn && checkOut) {
  const today = new Date();
  const localToday = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  checkIn.min = localToday; checkOut.min = localToday;
  checkIn.addEventListener("change", () => {
    checkOut.min = checkIn.value || localToday;
    if (checkOut.value && checkOut.value <= checkIn.value) checkOut.value = "";
  });
}

if (bookingForm) bookingForm.addEventListener("submit", async (event) => {
  event.preventDefault(); errorBox.textContent = "";
  const submitButton = bookingForm.querySelector('button[type="submit"]');
  const data = new FormData(bookingForm);
  const booking = {
    guest_name: String(data.get("name") || "").trim(),
    guest_email: String(data.get("email") || "").trim() || null,
    check_in: String(data.get("checkin") || ""),
    check_out: String(data.get("checkout") || ""),
    guests: String(data.get("guests") || ""),
    apartment_type: String(data.get("apartment") || "Not sure yet"),
    guest_message: String(data.get("notes") || "").trim() || null
  };
  if (!booking.guest_name || !booking.check_in || !booking.check_out || !booking.guests) {
    errorBox.textContent = "Please complete all required fields."; return;
  }
  if (booking.check_out <= booking.check_in) {
    errorBox.textContent = "Check-out must be after the check-in date."; checkOut.focus(); return;
  }

  const message = [
    "Hello The Lennox Apartments, I would like to request a booking.", "",
    `Full name: ${booking.guest_name}`, `Email: ${booking.guest_email || "Not provided"}`,
    `Check-in: ${booking.check_in}`, `Check-out: ${booking.check_out}`,
    `Guests: ${booking.guests}`, `Apartment preference: ${booking.apartment_type}`,
    `Additional details: ${booking.guest_message || "None"}`, "",
    "Please confirm availability, total rate and the next steps. I understand this request is not a confirmed reservation."
  ].join("\n");
  const whatsappUrl = `https://wa.me/233205289701?text=${encodeURIComponent(message)}`;

  // Open WhatsApp immediately in the click gesture; browsers may block popups
  // if window.open is delayed until after an asynchronous database request.
  window.open(whatsappUrl, "_blank", "noopener,noreferrer");

  const config = window.LENNOX_SUPABASE || {};
  if (config.url && config.anonKey && window.supabase?.createClient) {
    submitButton.disabled = true;
    submitButton.textContent = "Saving request…";
    try {
      const client = window.supabase.createClient(config.url, config.anonKey);
      const { error } = await client.from("bookings").insert(booking);
      if (error) throw error;
    } catch (error) {
      errorBox.textContent = "We couldn't save your request online. WhatsApp will still open; please send your request there.";
      console.error("Booking save error:", error);
    } finally {
      submitButton.disabled = false;
      submitButton.innerHTML = 'Continue to WhatsApp <span>↗</span>';
    }
  } else {
    errorBox.textContent = "Online booking records are not connected yet. Your request will still open in WhatsApp.";
  }
});
