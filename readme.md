# The Lennox Apartments website + admin dashboard

Responsive static website for The Lennox Apartments, Airport Residential, Accra, Ghana.

## Included
- Responsive property website, gallery, location, FAQs and enquiry content
- Guest booking-request form with date validation
- WhatsApp handoff to +233 20 528 9701 with booking details pre-filled
- Optional online booking-request storage in Supabase
- Private administrator sign-in at `admin.html`
- Admin dashboard to review requests, filter by status, update booking status, mark payment status, record GHS amount, add internal notes and delete requests
- Paystack hosted payment link: https://paystack.shop/pay/cat-8sewke

## Important: connect the backend before using the dashboard

The dashboard is built on Supabase. The `config.js` file in this package is already filled with the Supabase Project URL and publishable key supplied for this project. Until that is done, the site can still hand booking requests to WhatsApp, but those requests will not be saved in the dashboard.

### 1. Create a Supabase project
1. Create a project at https://supabase.com/.
2. The Project URL and publishable key are already entered in `config.js`. If you ever rotate the key, update that file with the new publishable key.
4. Only use the publishable key (or legacy anon/public key) in the browser. **Never paste a service_role key, database password or Paystack secret key into website files.**

### 2. Create the database
1. In Supabase, open SQL Editor.
2. Open the included `setup.sql`, copy all its contents and run it.
3. This creates the booking table, admin allow-list, timestamp trigger and row-level security policies. Visitors may submit booking requests; only approved admin accounts can view or manage them.

### 3. Create your administrator login
1. In Supabase, go to Authentication → Users and add the administrator user using **bethanyham01@gmail.com** and a strong, unique password. Do not reuse a password shared in chat. Disable public sign-ups in Authentication settings.
2. Copy the exact email address you used.
3. In SQL Editor, run this query after replacing the email:
   `insert into public.admin_users (user_id) select id from auth.users where email = 'YOUR-ADMIN-EMAIL@example.com' on conflict (user_id) do nothing;`
4. The final statement at the bottom of `setup.sql` adds `bethanyham01@gmail.com` as an approved administrator after the account exists. Run that statement (or rerun the full setup file) after creating the Auth user.
5. Open `https://YOUR-SITE.netlify.app/admin.html` and sign in with that email and the password you created privately.

### 4. Publish
Upload the entire extracted `the-lennox-apartments` folder to your existing Netlify site using Deploys → Deploy manually. Include `config.js`, `admin.html`, `admin.js`, `admin.css` and `setup.sql` in the deployment.

## Booking and payment flow
1. A guest submits the website booking form.
2. The request is inserted into Supabase (once configured) and WhatsApp opens with the same details.
3. The property team confirms dates, apartment availability and the amount due.
4. The guest can use the hosted Paystack page after the amount and reservation are confirmed.
5. An administrator manually updates booking and payment statuses after checking the records and Paystack dashboard.

**Limitations:** This is a booking-request manager, not a live inventory reservation engine. It does not prevent double-bookings, send automated emails, reconcile Paystack transactions, or verify payment automatically. Payment status is a manual admin update. Automated payment verification requires a secure server-side Paystack integration and webhook; never add secret keys to browser JavaScript.

## Before launch
- Replace the Supabase placeholders and complete the setup steps.
- Confirm the WhatsApp number, property details, facilities, rates and booking policies.
- Replace illustrative photos with approved property photography.
- Test a guest booking request and admin sign-in after deployment.
