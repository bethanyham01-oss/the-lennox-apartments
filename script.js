// ==========================================
// THE LENNOX APARTMENTS - WEBSITE SCRIPT
// ==========================================

// MOBILE NAVIGATION
const menuButton = document.querySelector(".menu-toggle");
const navigation = document.querySelector(".main-nav");

if (menuButton && navigation) {
  menuButton.addEventListener("click", () => {
    const isOpen = navigation.classList.toggle("open");

    menuButton.setAttribute("aria-expanded", String(isOpen));
    menuButton.setAttribute(
      "aria-label",
      isOpen ? "Close navigation" : "Open navigation"
    );
    menuButton.textContent = isOpen ? "×" : "☰";
  });

  navigation.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navigation.classList.remove("open");
      menuButton.setAttribute("aria-expanded", "false");
      menuButton.setAttribute("aria-label", "Open navigation");
      menuButton.textContent = "☰";
    });
  });
}

// AUTOMATIC FOOTER YEAR
const year = document.getElementById("year");

if (year) {
  year.textContent = new Date().getFullYear();
}

// APARTMENT RATE SELECTION
const apartmentSelect = document.getElementById("apartment-select");
const selectedRateInput = document.getElementById("selected-rate");

document.querySelectorAll(".rate-choice").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".rate-choice.selected").forEach((item) => {
      item.classList.remove("selected");
    });

    button.classList.add("selected");

    if (apartmentSelect) {
      apartmentSelect.value = button.dataset.room || "";
    }

    if (selectedRateInput) {
      selectedRateInput.value = button.dataset.rate || "";
    }

    document.getElementById("booking")?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  });
});

// BOOKING FORM
const bookingForm = document.getElementById("booking-form");
const checkIn = bookingForm?.elements.namedItem("checkin");
const checkOut = bookingForm?.elements.namedItem("checkout");
const errorBox = document.getElementById("form-error");

let isSubmitting = false;

// LOCAL DATE
function getLocalToday() {
  const today = new Date();
  const localDate = new Date(
    today.getTime() - today.getTimezoneOffset() * 60000
  );

  return localDate.toISOString().slice(0, 10);
}

// DATE VALIDATION
if (checkIn && checkOut) {
  const today = getLocalToday();

  checkIn.min = today;
  checkOut.min = today;

  checkIn.addEventListener("change", () => {
    checkOut.min = checkIn.value || today;

    if (checkOut.value && checkOut.value <= checkIn.value) {
      checkOut.value = "";
    }
  });
}

// DISPLAY WHATSAPP FALLBACK LINK
function showWhatsAppLink(url, message) {
  if (!errorBox) return;

  errorBox.replaceChildren();
  errorBox.append(document.createTextNode(message + " "));

  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = "Open WhatsApp";

  errorBox.appendChild(link);
}

// BOOKING SUBMISSION
if (bookingForm) {
  bookingForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (isSubmitting) return;

    if (errorBox) {
      errorBox.textContent = "";
    }

    const submitButton = bookingForm.querySelector(
      'button[type="submit"]'
    );

    const data = new FormData(bookingForm);

    // BASIC HONEYPOT SPAM CHECK
    const spamField = String(
      data.get("company_website") || ""
    ).trim();

    if (spamField) {
      return;
    }

    // COLLECT BOOKING DETAILS
    const booking = {
      guest_name: String(data.get("name") || "").trim(),
      guest_email:
        String(data.get("email") || "").trim() || null,
      check_in: String(data.get("checkin") || ""),
      check_out: String(data.get("checkout") || ""),
      guests: String(data.get("guests") || ""),
      apartment_type:
        String(data.get("apartment") || "").trim(),
      guest_message: [
        `Selected rate: ${String(
          data.get("selected_rate") || ""
        ).trim()}`,
        `Guest notes: ${
          String(data.get("notes") || "").trim() || "None"
        }`
      ].join("\n")
    };

    // REQUIRED FIELD VALIDATION
    if (
      !booking.guest_name ||
      !booking.check_in ||
      !booking.check_out ||
      !booking.guests ||
      !booking.apartment_type ||
      !String(data.get("selected_rate") || "").trim()
    ) {
      if (errorBox) {
        errorBox.textContent =
          "Please complete all required fields and select an apartment rate above.";
      }
      return;
    }

    if (booking.guest_name.length > 160) {
      if (errorBox) {
        errorBox.textContent =
          "Please keep your name within 160 characters.";
      }
      return;
    }

    // DATE VALIDATION
    if (booking.check_in < getLocalToday()) {
      if (errorBox) {
        errorBox.textContent =
          "Please select a check-in date that is today or later.";
      }
      checkIn?.focus();
      return;
    }

    if (booking.check_out <= booking.check_in) {
      if (errorBox) {
        errorBox.textContent =
          "Check-out must be after the check-in date.";
      }
      checkOut?.focus();
      return;
    }

    // PREVENT DOUBLE SUBMISSION
    isSubmitting = true;

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Saving request…";
    }

    // OPEN A TEMPORARY WINDOW DURING THE USER'S CLICK.
    // This helps avoid popup blocking after the database request.
    let whatsappWindow = null;

    try {
      whatsappWindow = window.open("about:blank", "_blank");
    } catch (error) {
      console.warn("WhatsApp window could not be opened:", error);
    }

    let bookingReference = "";
    let saveSucceeded = false;

    try {
      // CONNECT TO SUPABASE
      const config = window.LENNOX_SUPABASE || {};

      if (
        !config.url ||
        !config.anonKey ||
        !window.supabase?.createClient
      ) {
        throw new Error("Supabase configuration is unavailable.");
      }

      const client = window.supabase.createClient(
        config.url,
        config.anonKey
      );

      // SAVE BOOKING AND RETRIEVE GENERATED REFERENCE
      const { data: savedBooking, error } = await client
        .from("bookings")
        .insert(booking)
        .select("booking_reference")
        .single();

      if (error) {
        throw error;
      }

      bookingReference = savedBooking?.booking_reference || "";

      if (!bookingReference) {
        throw new Error("The booking reference was not returned.");
      }

      saveSucceeded = true;

    } catch (error) {
      console.error("Booking save error:", error);
    }

    // BUILD WHATSAPP MESSAGE
    const message = [
      "Hello The Lennox Apartments, I would like to request a booking.",
      "",
      `Booking reference: ${bookingReference || "Pending"}`,
      `Full name: ${booking.guest_name}`,
      `Email: ${booking.guest_email || "Not provided"}`,
      `Check-in: ${booking.check_in}`,
      `Check-out: ${booking.check_out}`,
      `Guests: ${booking.guests}`,
      `Apartment: ${booking.apartment_type}`,
      booking.guest_message,
      "",
      "Please confirm availability, total rate and the next steps.",
      "I understand this request is not a confirmed reservation."
    ].join("\n");

    const whatsappUrl =
      `https://wa.me/233205289701?text=${encodeURIComponent(message)}`;

    // SEND THE USER TO WHATSAPP
    if (whatsappWindow && !whatsappWindow.closed) {
      try {
        whatsappWindow.location.href = whatsappUrl;
      } catch (error) {
        console.warn("Could not redirect WhatsApp window:", error);
        showWhatsAppLink(
          whatsappUrl,
          "Your request is ready."
        );
      }
    } else {
      showWhatsAppLink(
        whatsappUrl,
        "Your request is ready. Tap here to continue to WhatsApp."
      );
    }

    // SHOW RESULT
    if (!saveSucceeded && errorBox) {
      errorBox.textContent =
        "We couldn't save your request online. Please send your request through WhatsApp. Your booking reference is not yet available.";
    } else if (saveSucceeded && errorBox) {
      errorBox.textContent =
        `Your booking request has been saved. Reference: ${bookingReference}. Please continue to WhatsApp.`;
    }

    // RESTORE BUTTON
    isSubmitting = false;

    if (submitButton) {
      submitButton.disabled = false;
      submitButton.innerHTML =
        'Continue to WhatsApp <span>↗</span>';
    }
  });
}
