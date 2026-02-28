// src/lib/server/newsletterTemplates.ts
import { buildAppUrl } from "@/lib/config/urls";

export const newsletterTemplates = {
  // Welcome email for new subscribers
  welcome: {
    name: "Welcome Email",
    subject: "Welcome to Snapcart Newsletter! 🎉",
    html: (data: { userName?: string }) => `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <div style="background: linear-gradient(135deg, #16a34a 0%, #059669 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 32px;">Welcome to Snapcart! 🛒</h1>
        </div>
        <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e5e7eb;">
          <h2 style="color: #111827; margin-top: 0;">Hi ${data.userName || "there"}! 👋</h2>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            Thank you for subscribing to Snapcart newsletter! We're thrilled to have you in our community.
          </p>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            Here's what you can expect from us:
          </p>
          <ul style="color: #4b5563; font-size: 16px; line-height: 1.8;">
            <li>🎁 Exclusive deals and discounts</li>
            <li>🆕 New product launches</li>
            <li>📰 Weekly grocery tips and recipes</li>
            <li>🎯 Personalized recommendations</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${buildAppUrl()}" 
               style="background: #16a34a; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              Start Shopping
            </a>
          </div>
        </div>
      </div>
    `,
  },

  // Weekly deals newsletter
  weeklyDeals: {
    name: "Weekly Deals",
    subject: "This Week's Hot Deals 🔥",
    html: (data: { deals?: Array<{ name: string; discount: string; image?: string }> }) => `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <div style="background: #fef3c7; padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: #92400e; margin: 0; font-size: 28px;">🔥 Weekly Hot Deals!</h1>
          <p style="color: #78350f; margin: 10px 0 0;">Limited time offers just for you</p>
        </div>
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb;">
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            Check out this week's amazing deals on your favorite products!
          </p>
          <div style="margin: 20px 0;">
            ${(data.deals || []).map(deal => `
              <div style="border: 2px solid #16a34a; border-radius: 8px; padding: 15px; margin: 15px 0;">
                <h3 style="color: #16a34a; margin: 0 0 10px;">${deal.name}</h3>
                <p style="color: #ef4444; font-size: 24px; font-weight: bold; margin: 0;">${deal.discount} OFF</p>
              </div>
            `).join('')}
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${buildAppUrl('/user/groceries')}" 
               style="background: #16a34a; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              Shop Now
            </a>
          </div>
        </div>
      </div>
    `,
  },

  // New product launch
  productLaunch: {
    name: "New Product Launch",
    subject: "🆕 New Products Just Arrived!",
    html: (data: { products?: Array<{ name: string; description: string; image?: string }> }) => `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <div style="background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 32px;">✨ Fresh Arrivals!</h1>
          <p style="color: #e9d5ff; margin: 10px 0 0;">Discover our newest products</p>
        </div>
        <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e5e7eb;">
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            We've just added some amazing new products to our store. Be the first to try them!
          </p>
          <div style="margin: 30px 0;">
            ${(data.products || []).map(product => `
              <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #111827; margin: 0 0 10px;">${product.name}</h3>
                <p style="color: #6b7280; margin: 0;">${product.description}</p>
              </div>
            `).join('')}
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${buildAppUrl('/user/groceries')}" 
               style="background: #7c3aed; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              Explore New Products
            </a>
          </div>
        </div>
      </div>
    `,
  },

  // Recipe & tips newsletter
  recipeTips: {
    name: "Recipe & Tips",
    subject: "🍳 This Week's Recipe & Shopping Tips",
    html: (data: { recipe?: { title: string; description: string; ingredients?: string[] }; tips?: string[] }) => `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 32px;">🍳 Recipe of the Week</h1>
        </div>
        <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e5e7eb;">
          ${data.recipe ? `
            <h2 style="color: #111827; margin-top: 0;">${data.recipe.title}</h2>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
              ${data.recipe.description}
            </p>
            ${data.recipe.ingredients ? `
              <h3 style="color: #16a34a;">Ingredients:</h3>
              <ul style="color: #4b5563; font-size: 16px; line-height: 1.8;">
                ${data.recipe.ingredients.map(ing => `<li>${ing}</li>`).join('')}
              </ul>
            ` : ''}
          ` : ''}
          
          ${data.tips && data.tips.length > 0 ? `
            <h3 style="color: #16a34a; margin-top: 30px;">💡 Shopping Tips:</h3>
            <ul style="color: #4b5563; font-size: 16px; line-height: 1.8;">
              ${data.tips.map(tip => `<li>${tip}</li>`).join('')}
            </ul>
          ` : ''}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${buildAppUrl('/user/groceries')}" 
               style="background: #f59e0b; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              Shop Ingredients
            </a>
          </div>
        </div>
      </div>
    `,
  },

  // Seasonal promotions
  seasonal: {
    name: "Seasonal Promotion",
    subject: "🎉 Special Season Sale!",
    html: (data: { season?: string; discount?: string; message?: string }) => `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <div style="background: linear-gradient(135deg, #ec4899 0%, #ef4444 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 36px;">🎉 ${data.season || 'Special'} Sale!</h1>
          <p style="color: #fce7f3; margin: 10px 0 0; font-size: 20px; font-weight: bold;">
            ${data.discount || 'UP TO 50%'} OFF
          </p>
        </div>
        <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e5e7eb;">
          <p style="color: #4b5563; font-size: 18px; line-height: 1.6; text-align: center;">
            ${data.message || 'Celebrate with amazing deals on all your favorite products!'}
          </p>
          <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 30px 0;">
            <p style="color: #991b1b; margin: 0; font-weight: bold;">⏰ Limited Time Offer!</p>
            <p style="color: #991b1b; margin: 10px 0 0;">Don't miss out on these incredible savings.</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${buildAppUrl('/user/groceries')}" 
               style="background: #ef4444; color: white; padding: 16px 40px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 18px;">
              Shop Sale Now
            </a>
          </div>
        </div>
      </div>
    `,
  },

  // Simple announcement
  announcement: {
    name: "General Announcement",
    subject: "📢 Important Update from Snapcart",
    html: (data: { title?: string; message?: string; buttonText?: string; buttonUrl?: string }) => `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <div style="background: #1f2937; padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">📢 ${data.title || 'Announcement'}</h1>
        </div>
        <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e5e7eb;">
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            ${data.message || 'We have an important update to share with you.'}
          </p>
          ${data.buttonText && data.buttonUrl ? `
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.buttonUrl}" 
                 style="background: #16a34a; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                ${data.buttonText}
              </a>
            </div>
          ` : ''}
        </div>
      </div>
    `,
  },
};

export type NewsletterTemplateKey = keyof typeof newsletterTemplates;

export function getTemplate(templateKey: NewsletterTemplateKey, data?: any) {
  const template = newsletterTemplates[templateKey];
  if (!template) {
    throw new Error(`Template ${templateKey} not found`);
  }
  return {
    subject: template.subject,
    html: template.html(data || {}),
  };
}
