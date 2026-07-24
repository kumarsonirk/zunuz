const nodemailer = require('nodemailer');

// Load environment variables for email
const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM
} = process.env;

const isConfigured = SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS;

let transporter = null;

if (isConfigured) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT, 10) || 587,
    secure: parseInt(SMTP_PORT, 10) === 465, // true for 465, false for other ports
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  // Verify connection configuration
  transporter.verify((error) => {
    if (error) {
      console.warn('❌ SMTP Connection failed:', error.message);
    } else {
      console.log('✅ SMTP Connection established successfully.');
    }
  });
} else {
  console.log('ℹ️ SMTP is not configured. System emails will be logged to the console instead.');
}

/**
 * Helper to send email or log to console
 */
async function sendMailHelper(options) {
  if (isConfigured && transporter) {
    try {
      const info = await transporter.sendMail({
        from: SMTP_FROM || SMTP_USER,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
      console.log(`✉️ Email sent successfully to ${options.to}. MessageID: ${info.messageId}`);
      return info;
    } catch (error) {
      console.error(`❌ Failed to send email to ${options.to}:`, error);
      // Don't throw so that the application doesn't crash on email failure
      return null;
    }
  } else {
    // Graceful fallback to console logging with formatted styling
    console.log('\n======================================================');
    console.log(`✉️  [SIMULATED EMAIL SENT]`);
    console.log(`TO:      ${options.to}`);
    console.log(`SUBJECT: ${options.subject}`);
    console.log(`BODY:`);
    console.log(options.text || options.html);
    console.log('======================================================\n');
    return { messageId: 'simulated-id' };
  }
}

/**
 * Generate welcome email HTML string
 */
function getWelcomeEmailHtml(name) {
  const formattedName = name || 'Friend';
  const imageBase = process.env.CLIENT_URL || 'http://localhost:5173';

  return `
    <div style="padding: 40px 20px; font-family: 'Grift', 'Space Grotesk', sans-serif; text-align: center;">

      <!-- Main card -->
      <table cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #1f2024; border-radius: 16px; overflow: hidden; box-shadow: 0 3px 5px rgba(0,0,0,0.3); border-collapse: collapse;">

       <tr>
          <td align="center">
            <img src="${imageBase}/logo_white.png" height="30" style="padding: 20px; display: block; border: 0; outline: none; text-decoration: none;" alt="ZUNUZ" />
          </td>
        </tr>
        
        <!-- SECTION 1: HERO (Signature Red Gradient) -->
        <tr>
          <td style="padding: 48px 32px 32px 32px; background-color: #fff; text-align: center;">
            <h1 style="font-family: 'Grift', 'Space Grotesk', sans-serif; font-size: 24px; font-weight: bold; color: #1f2024; margin: 0 0 12px 0; letter-spacing: 0.05em;">Welcome to the ZUNUZ Family! 💎</h1>
            <p style="font-size: 15px; color: #1f2024; line-height: 1.6; margin: 0 0 24px 0; max-width: 440px; margin-left: auto; margin-right: auto;">
              Hi, ${formattedName}! We're excited to have you here. Explore exclusive jewellery, made with precision, passion, and elegance.
            </p>
            <table cellpadding="0" cellspacing="0" style="margin: 0 auto 32px auto; border-collapse: collapse;">
              <tr>
                <td align="center" style="background-color: #131417; border-radius: 8px;">
                  <a href="${imageBase}/login" style="display: inline-block; padding: 14px 28px; font-size: 14px; font-weight: bold; color: #ffffff; text-decoration: none; text-transform: uppercase; letter-spacing: 0.05em;">
                    Start Shopping
                  </a>
                </td>
              </tr>

              
            </table>
            <!-- Pearls Hero Image -->
            
          </td>
        </tr>
        
      </table>

      <!-- Footer Section -->
      <table cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 32px auto 0 auto; border-collapse: collapse;">
        <tr>
          <td align="center" style="font-size: 15px; color: #71717a; padding-bottom: 16px;">
            Follow Us on!
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-bottom: 24px;">
            <a href="https://instagram.com" style="text-decoration: none; margin: 0 6px; display: inline-block;"><img src="https://cdn-icons-png.flaticon.com/512/2111/2111463.png" width="24" height="24" alt="Instagram" /></a>
          </td>
        </tr>
        <tr>
          <td align="center" style="font-size: 13px; color: #52525b; line-height: 1.6;">
            You are receiving this email because you signed up on our store.<br/>
           This is an automated message. Please do not reply directly to this email.
          </td>
        </tr>
      </table>
    </div>
  `;
}


/**
 * Send welcome email to a new user
 */
async function sendWelcomeEmail(email, name) {
  const subject = 'Welcome to ZUNUZ!';
  const formattedName = name || 'Friend';
  
  const html = getWelcomeEmailHtml(formattedName);
  const text = `Welcome to ZUNUZ, ${formattedName}!\n\nWe are thrilled to welcome you to our community. Thank you for creating an account with us.\n\nStart shopping by visiting: ${process.env.CLIENT_URL || 'http://localhost:5173'}/login`;

  return sendMailHelper({ to: email, subject, html, text });
}


/**
 * Send password reset email
 */
async function sendPasswordResetEmail(email, name, resetLink) {
  const subject = 'Reset Your Password - ZUNUZ';
  const formattedName = name || 'Customer';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1F2024; background-color: #F9F9FA; border-radius: 12px; border: 1px solid #EDEDF0;">
      <h2 style="color: #FC4B4E; margin-bottom: 20px; font-weight: 700;">Password Reset Request</h2>
      <p style="font-size: 15px; line-height: 1.6; color: #3F3F46;">
        Hello ${formattedName},
      </p>
      <p style="font-size: 15px; line-height: 1.6; color: #3F3F46;">
        We received a request to reset the password for your ZUNUZ account. Click the button below to set a new password:
      </p>
      <div style="margin: 30px 0; text-align: center;">
        <a href="${resetLink}" style="background-color: #FC4B4E; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;">
          Reset Password
        </a>
      </div>
      <p style="font-size: 14px; color: #71717A; line-height: 1.5;">
        This link is only valid for <strong>15 minutes</strong>. If you did not request a password reset, you can safely ignore this email.
      </p>
      <p style="font-size: 13px; color: #A1A1AA; word-break: break-all; margin-top: 20px;">
        If the button above does not work, copy and paste this URL into your browser:<br/>
        <a href="${resetLink}" style="color: #FC4B4E; text-decoration: underline;">${resetLink}</a>
      </p>
      <hr style="border: 0; border-top: 1px solid #E4E4E7; margin: 30px 0;" />
      <p style="font-size: 12px; color: #71717A; text-align: center; margin: 0;">
        This is an automated message. Please do not reply directly to this email.
      </p>
    </div>
  `;

  const text = `Hello ${formattedName},\n\nWe received a request to reset the password for your ZUNUZ account. Click the link below or copy and paste it into your browser to reset your password:\n\n${resetLink}\n\nThis link is only valid for 15 minutes.`;

  return sendMailHelper({ to: email, subject, html, text });
}

/**
 * Generate order confirmation HTML string
 */
function getOrderConfirmationHtml(order) {
  const customerName = order.address?.name || order.customer?.name || 'Customer';
  const imageBase = process.env.CLIENT_URL || 'http://localhost:5173';

  // Format order date
  const orderDateFormatted = order.createdAt 
    ? new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  // Format items HTML
  const itemsHtml = order.items.map(item => {
    // Construct absolute product image URL
    const productImage = item.product?.image 
      ? (item.product.image.startsWith('http') ? item.product.image : `http://localhost:3001${item.product.image}`)
      : `${imageBase}/placeholder.png`;

    return `
      <tr style="border-bottom: 1px solid rgba(0, 0, 0, 0.06);">
        <td style="padding: 16px 0;">
          <table cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;">
            <tr>
              <td width="60" style="vertical-align: middle; padding: 0;">
                <img src="${productImage}" width="50" height="50" style="border-radius: 8px; object-fit: cover; display: block; border: 1px solid rgba(0, 0, 0, 0.08);" />
              </td>
              <td style="padding-left: 12px; vertical-align: middle; text-align: left;">
                <div style="font-size: 15px; font-weight: bold; color: #1a1a1a; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">${item.product?.name || 'Jewellery Item'}</div>
                <div style="font-size: 12px; color: #71717a; margin-top: 4px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">Quantity: ${item.quantity}x</div>
              </td>
              <td align="right" style="vertical-align: middle; font-size: 15px; font-weight: 600; color: #1a1a1a; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
                ₹${item.quantity * item.price}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `;
  }).join('');

  const addr = order.address || {};
  const addressString = [addr.houseNo, addr.street, addr.landmark, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ');

  return `
    <div style="background-color: #ffffff; padding: 20px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
      <table cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; margin: 0 auto; background-color: #1f2024; border-radius: 16px; overflow: hidden; border: 1px solid #e4e4e7; border-collapse: collapse;">
        <!-- Top Section Content -->
         <tr>
          <td align="center">
            <img src="${imageBase}/logo_white.png" height="30" style="padding: 20px; display: block; border: 0; outline: none; text-decoration: none;" alt="ZUNUZ" />
          </td>
        </tr>
        
        <tr>
          <td style="padding: 40px 32px 24px 32px; background-color: #1f2024;">
            <h1 style="font-family: 'Grift', 'Space Grotesk', sans-serif; font-size: 28px; font-weight: normal; color: #fff; margin: 0 0 16px 0; text-align: left;">Order confirmation.</h1>
            <p style="font-size: 15px; color: #fff; line-height: 1.5; margin: 0 0 30px 0; text-align: left;">
              Hi ${customerName}, your order for ${order.items.length} product${order.items.length > 1 ? 's' : ''} has been confirmed.
            </p>

            <!-- Items Box -->
            <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff; border-radius: 12px; border: 1px solid rgba(0,0,0,0.06); border-collapse: collapse;">
              <tr>
                <td style="padding: 24px;">
                  <table cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;">
                    <tr>
                      <td style="font-family: 'Grift', 'Space Grotesk', sans-serif; font-size: 20px; color: #1a1a1a; padding-bottom: 8px; text-align: left;">Items</td>
                    </tr>
                    ${itemsHtml}
                    <!-- Subtotals -->
                    <tr>
                      <td style="padding-top: 20px;">
                        <table cellpadding="0" cellspacing="0" width="100%" style="font-size: 14px; color: #52525b; border-collapse: collapse;">
                          <tr>
                            <td style="padding: 4px 0; text-align: left;">Sub total:</td>
                            <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #1a1a1a;">₹${order.total}</td>
                          </tr>
                          <tr>
                            <td style="padding: 4px 0; text-align: left;">Shipping fee:</td>
                            <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #1a1a1a;">₹0.00 (Free)</td>
                          </tr>
                          <tr style="border-top: 1px solid rgba(0, 0, 0, 0.08);">
                            <td style="padding: 16px 0 0 0; text-align: left; font-size: 15px; font-weight: bold; color: #1a1a1a;">Grand Total:</td>
                            <td style="padding: 16px 0 0 0; text-align: right; font-size: 18px; font-weight: bold; color: #FC4B4E;">₹${order.total}</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Ticket Tear Divider Row -->

        <!-- Bottom Section Content -->
        <tr>
          <td style="padding: 24px 32px 40px 32px; background-color: #1f2024;">
            <h3 style="font-family: 'Grift', 'Space Grotesk', sans-serif; font-size: 18px; font-weight: normal; color: #fff; margin: 0 0 20px 0; text-align: left;">Order details</h3>
            
            <!-- Information Grid -->
            <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 36px; border-collapse: collapse;">
              <tr>
                <td width="25%" style="vertical-align: top; border-right: 1px solid #e4e4e7; padding: 0 10px 0 0; text-align: left;">
                  <div style="font-size: 12px; font-weight: bold; color: #fff; margin-bottom: 6px;">Order id:</div>
                  <div style="font-size: 13px; color: #fff; line-height: 1.4;">${order.id}</div>
                </td>
                <td width="25%" style="vertical-align: top; border-right: 1px solid #e4e4e7; padding: 0 10px; text-align: left;">
                  <div style="font-size: 12px; font-weight: bold; color: #fff; margin-bottom: 6px;">Address:</div>
                  <div style="font-size: 12px; color: #fff; line-height: 1.4; word-break: break-word;">${addressString}</div>
                </td>
                <td width="25%" style="vertical-align: top; border-right: 1px solid #e4e4e7; padding: 0 10px; text-align: left;">
                  <div style="font-size: 12px; font-weight: bold; color: #fff; margin-bottom: 6px;">Order date:</div>
                  <div style="font-size: 13px; color: #fff; line-height: 1.4;">${orderDateFormatted}</div>
                </td>
                <td width="25%" style="vertical-align: top; padding: 0 0 0 10px; text-align: left;">
                  <div style="font-size: 12px; font-weight: bold; color: #fff; margin-bottom: 6px;">Payment:</div>
                  <div style="font-size: 13px; color: #fff; line-height: 1.4;">${order.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Online Card'}</div>
                </td>
              </tr>
            </table>

            <!-- Footer & QR Code -->
            <table cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;">
              <tr>
                <td style="vertical-align: middle; text-align: left;">
                  <p style="font-size: 14px; color: #fff; margin: 0 0 8px 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">Thank you for shopping with us.</p>
                  <p style="font-size: 12px; color: #a1a1aa; margin: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">Need help? <a href="${imageBase}/account/help-center" style="color: #FC4B4E; text-decoration: none; font-weight: 500;">zunuz.in</a></p>
                </td>
                <td align="right" width="80" style="vertical-align: middle; padding: 0;">
                  <img src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(imageBase + '/account/orders')}" width="70" height="70" style="display: block; border: 1px solid #e4e4e7; border-radius: 4px;" alt="QR Code" />
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;
}

/**
 * Send order confirmation receipt
 */
async function sendOrderConfirmationEmail(email, order) {
  const subject = `Order Confirmed #${order.id} - ZUNUZ`;
  const customerName = order.address?.name || order.customer?.name || 'Customer';

  const itemsText = order.items.map(item => 
    `- ${item.product?.name} (Qty: ${item.quantity} @ ₹${item.price}) = ₹${item.quantity * item.price}`
  ).join('\n');

  const addr = order.address || {};
  const addressString = [addr.houseNo, addr.street, addr.landmark, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ');

  const html = getOrderConfirmationHtml(order);
  const text = `Order Confirmed!\n\nThank you for shopping at ZUNUZ, ${customerName}. Your order #${order.id} has been placed.\n\nITEMS:\n${itemsText}\n\nTOTAL: ₹${order.total}\n\nSHIPPING ADDRESS:\n${addressString}\n\nPAYMENT METHOD: ${order.paymentMethod}`;

  return sendMailHelper({ to: email, subject, html, text });
}

/**
 * Send order cancellation email
 */
async function sendOrderCancellationEmail(email, order) {
  const subject = `Order Cancelled #${order.id} - ZUNUZ`;
  const customerName = order.address?.name || order.customer?.name || 'Customer';
  const imageBase = process.env.CLIENT_URL || 'http://localhost:5173';

  const html = `
    <div style="background-color: #131417; padding: 40px 20px; font-family: 'Grift', 'Space Grotesk', sans-serif; text-align: center;">
      <!-- Logo Header -->
      <table cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto 24px auto; border-collapse: collapse;">
        <tr>
          <td align="center">
            <img src="${imageBase}/logo_white.png" height="30" style="display: block; border: 0; outline: none;" alt="ZUNUZ" />
          </td>
        </tr>
      </table>

      <!-- Main card -->
      <table cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 15px 35px rgba(0,0,0,0.5); border-collapse: collapse; border: 1px solid #e4e4e7;">
        <tr>
          <td style="padding: 40px 32px 32px 32px; background-color: #ffffff; text-align: left;">
            <h1 style="font-family: 'Grift', 'Space Grotesk', sans-serif; font-size: 28px; font-weight: normal; color: #EF4444; margin: 0 0 16px 0;">Order cancelled.</h1>
            <p style="font-size: 15px; color: #52525b; line-height: 1.5; margin: 0 0 24px 0;">
              Hi ${customerName}, your order #${order.id} has been cancelled. Any payment made will be refunded to your source account within 5-7 working days.
            </p>
            <p style="font-size: 14px; color: #71717a; line-height: 1.5; margin: 0;">
              If you have any questions or would like to reactivate your order, please reply to this email or visit our help center.
            </p>
          </td>
        </tr>
      </table>
    </div>
  `;

  const text = `Order Cancelled!\n\nHello ${customerName}, your order #${order.id} has been cancelled. Any payment made will be refunded within 5-7 working days.`;

  return sendMailHelper({ to: email, subject, html, text });
}

module.exports = {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendOrderConfirmationEmail,
  sendOrderCancellationEmail,
  getOrderConfirmationHtml,
  getWelcomeEmailHtml,
};
