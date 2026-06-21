// src/lib/server/invoice.ts
import connectDb from "@/lib/server/db";
import { Order } from "@/models/order.model";
import { OrderItem } from "@/models/orderItem.model";
import { Store } from "@/models/store.model";
import { User } from "@/models/user.model";
import puppeteer from "puppeteer";
import mongoose from "mongoose";

export async function generateInvoicePdf(orderId: string): Promise<Buffer> {
  await connectDb();

  // Populate order and sub-components
  const order = await Order.findById(orderId).populate({
    path: "orderItems",
    model: OrderItem,
    populate: [
      {
        path: "grocery",
        model: "Grocery",
      },
      {
        path: "variant.variantId",
        model: "GroceryVariant",
      },
    ],
  });

  if (!order) {
    throw new Error("Order not found");
  }

  // Fetch nearest store details for billing
  let storeDetails = {
    name: "SnapCart Dark Store",
    address: "Registered Dark Store Hub",
    city: "New Delhi",
    state: "Delhi",
    pincode: "110001",
    gstin: "07AAAAA1111A1Z1",
  };

  if (order.storeId) {
    const store = await Store.findById(order.storeId).lean();
    if (store) {
      storeDetails.name = store.name || storeDetails.name;
      storeDetails.address = store.location?.address || storeDetails.address;
      storeDetails.city = store.location?.city || storeDetails.city;
      storeDetails.state = store.location?.state || storeDetails.state;
      storeDetails.pincode = store.location?.pincode || storeDetails.pincode;
      if ((store as any).deliveryFee?.gstin) {
        storeDetails.gstin = (store as any).deliveryFee.gstin;
      }
    }
  }

  const currency = "₹";
  const items: any[] = order.orderItems || [];

  // Helper HSN guesses based on name
  const getHsn = (name: string): string => {
    const n = name.toLowerCase();
    if (n.includes("rice") || n.includes("flour") || n.includes("atta") || n.includes("pulse") || n.includes("dal")) {
      return "1006"; // Cereals & grains
    }
    if (n.includes("oil") || n.includes("ghee") || n.includes("butter")) {
      return "1512"; // Fats & oils
    }
    if (n.includes("milk") || n.includes("cheese") || n.includes("paneer") || n.includes("curd") || n.includes("yogurt")) {
      return "0402"; // Dairy
    }
    if (n.includes("soap") || n.includes("shampoo") || n.includes("wash") || n.includes("paste")) {
      return "3401"; // Toiletries & cleaning
    }
    return "2106"; // General grocery food preparations
  };

  // Compile items values & tax breakdown
  let productGstTotal = 0;
  const processedItems = items.map((item, index) => {
    const variantIdObj = item.variant?.variantId;
    const gstRate = variantIdObj?.gstRate ?? 5; // Default 5% inclusive
    const totalSelling = item.price.sellingPrice * item.quantity;
    
    // Inclusive tax calculation: Taxable Value = Selling Price / (1 + GST%)
    const taxableValue = Math.round((totalSelling / (1 + gstRate / 100)) * 100) / 100;
    const gstAmount = Math.round((totalSelling - taxableValue) * 100) / 100;
    const cgstAmount = Math.round((gstAmount / 2) * 100) / 100;
    const sgstAmount = Math.round((gstAmount - cgstAmount) * 100) / 100;
    
    productGstTotal += gstAmount;

    return {
      sNo: index + 1,
      name: item.groceryName || item.grocery?.name || "Grocery Item",
      label: item.variant?.label || "",
      hsn: getHsn(item.groceryName || item.grocery?.name || ""),
      qty: item.quantity,
      mrp: item.price.mrpPrice,
      selling: item.price.sellingPrice,
      total: totalSelling,
      taxableValue,
      gstRate,
      gstAmount,
      cgstAmount,
      sgstAmount,
    };
  });

  // Inclusive service GST breakdown (18% on fees: delivery, packaging, surcharge, COD)
  const activeFeeBase = order.deliveryFee + order.packagingFee + order.weightSurcharge + (order.codHandlingCharge || 0);
  const serviceGst = Math.round((activeFeeBase - (activeFeeBase / 1.18)) * 100) / 100;
  const serviceCgst = Math.round((serviceGst / 2) * 100) / 100;
  const serviceSgst = Math.round((serviceGst - serviceCgst) * 100) / 100;

  const totalTaxes = Math.round((productGstTotal + serviceGst) * 100) / 100;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invoice - ${order.orderNumber}</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                margin: 0;
                padding: 0;
                background-color: #ffffff;
                color: #1e293b;
                font-size: 11px;
                line-height: 1.4;
            }
            .page {
                width: 210mm;
                min-height: 297mm;
                padding: 15mm;
                margin: 0 auto;
                box-sizing: border-box;
                page-break-after: always;
                position: relative;
                background: white;
            }
            /* Reset last page break */
            .page:last-child {
                page-break-after: avoid !important;
            }
            .header-container {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                border-bottom: 2px solid #10b981;
                padding-bottom: 12px;
                margin-bottom: 15px;
            }
            .brand-logo {
                font-size: 22px;
                font-weight: 900;
                color: #059669;
                letter-spacing: -0.5px;
                display: flex;
                align-items: center;
                gap: 5px;
            }
            .invoice-title {
                text-align: right;
            }
            .invoice-title h1 {
                margin: 0;
                font-size: 18px;
                font-weight: 800;
                color: #1e293b;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .invoice-title p {
                margin: 2px 0 0 0;
                font-size: 10px;
                color: #64748b;
                font-weight: 600;
            }
            .addresses-grid {
                display: grid;
                grid-template-cols: 1fr 1fr;
                gap: 20px;
                margin-bottom: 20px;
            }
            .address-box {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                padding: 10px 12px;
                border-radius: 10px;
            }
            .address-box h3 {
                margin: 0 0 6px 0;
                font-size: 10px;
                font-weight: 800;
                color: #64748b;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .address-box p {
                margin: 2px 0;
                font-size: 10px;
                font-weight: 600;
                color: #334155;
            }
            .metadata-bar {
                display: grid;
                grid-template-cols: repeat(4, 1fr);
                gap: 10px;
                background: #f1f5f9;
                padding: 8px 12px;
                border-radius: 10px;
                margin-bottom: 20px;
                border: 1px solid #e2e8f0;
            }
            .metadata-item span {
                display: block;
            }
            .metadata-item .label {
                font-size: 8px;
                font-weight: 800;
                color: #64748b;
                text-transform: uppercase;
            }
            .metadata-item .value {
                font-size: 10px;
                font-weight: 700;
                color: #1e293b;
                margin-top: 2px;
            }
            table.items-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 20px;
            }
            table.items-table th {
                background: #0f172a;
                color: white;
                font-weight: 700;
                font-size: 9px;
                text-transform: uppercase;
                padding: 6px 8px;
                text-align: left;
                border: 1px solid #0f172a;
            }
            table.items-table td {
                padding: 8px;
                border: 1px solid #e2e8f0;
                font-size: 9px;
                color: #334155;
            }
            table.items-table tr:nth-child(even) {
                background: #f8fafc;
            }
            .right-align {
                text-align: right !important;
            }
            .center-align {
                text-align: center !important;
            }
            .billing-summary-container {
                display: flex;
                justify-content: flex-end;
                margin-top: 10px;
            }
            .billing-summary-table {
                width: 250px;
                border-collapse: collapse;
            }
            .billing-summary-table td {
                padding: 4px 6px;
                font-size: 10px;
                color: #475569;
            }
            .billing-summary-table tr.total-row td {
                font-size: 12px;
                font-weight: 900;
                color: #059669;
                border-top: 1.5px solid #059669;
                padding-top: 6px;
            }
            .savings-badge {
                color: #15803d;
                font-weight: 700;
            }
            .declaration-section {
                margin-top: 30px;
                padding: 10px 12px;
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 10px;
                font-size: 8px;
                color: #64748b;
                line-height: 1.5;
            }
            .page-footer {
                position: absolute;
                bottom: 15mm;
                left: 15mm;
                right: 15mm;
                display: flex;
                justify-content: space-between;
                font-size: 8px;
                color: #94a3b8;
                border-top: 1px solid #e2e8f0;
                padding-top: 8px;
            }
        </style>
    </head>
    <body>
        <!-- PAGE 1: GROCERY ORDER RECEIPT & SUMMARY -->
        <div class="page">
            <div class="header-container">
                <div class="brand-logo">
                    <span>🛒</span> SnapCart Grocery
                </div>
                <div class="invoice-title">
                    <h1>Order Summary</h1>
                    <p>Customer Delivery Copy</p>
                </div>
            </div>

            <div class="addresses-grid">
                <div class="address-box">
                    <h3>Dark Store Details</h3>
                    <p><strong>${storeDetails.name}</strong></p>
                    <p>${storeDetails.address}</p>
                    <p>${storeDetails.city}, ${storeDetails.state} - ${storeDetails.pincode}</p>
                    <p>FSSAI License: 13324999000182</p>
                </div>
                <div class="address-box">
                    <h3>Delivery Location</h3>
                    <p><strong>${order.deliveryAddress.fullName}</strong></p>
                    <p>${order.deliveryAddress.fullAddress}</p>
                    <p>${order.deliveryAddress.city}, ${order.deliveryAddress.state} - ${order.deliveryAddress.pincode}</p>
                    <p>Mobile: ${order.deliveryAddress.mobile}</p>
                </div>
            </div>

            <div class="metadata-bar">
                <div class="metadata-item">
                    <span class="label">Order Number</span>
                    <span class="value">#${order.orderNumber}</span>
                </div>
                <div class="metadata-item">
                    <span class="label">Order Date</span>
                    <span class="value">${new Date(order.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}</span>
                </div>
                <div class="metadata-item">
                    <span class="label">Payment Mode</span>
                    <span class="value">${order.paymentMethod === "cod" ? "Cash on Delivery" : `Online (${order.onlinePaymentType || "Stripe/Razorpay"})`}</span>
                </div>
                <div class="metadata-item">
                    <span class="label">Delivery Time</span>
                    <span class="value">Delivered Instantly</span>
                </div>
            </div>

            <h3 style="font-size: 11px; font-weight: 800; color: #1e293b; margin: 10px 0;">BASKET ITEMS</h3>
            <table class="items-table">
                <thead>
                    <tr>
                        <th style="width: 5%">#</th>
                        <th>Item Description</th>
                        <th style="width: 15%">Pack size</th>
                        <th class="center-align" style="width: 10%">Qty</th>
                        <th class="right-align" style="width: 15%">MRP Price</th>
                        <th class="right-align" style="width: 15%">Our Price</th>
                        <th class="right-align" style="width: 15%">Total (₹)</th>
                    </tr>
                </thead>
                <tbody>
                    ${processedItems
                      .map(
                        (item) => `
                        <tr>
                            <td class="center-align">${item.sNo}</td>
                            <td><strong>${item.name}</strong></td>
                            <td>${item.label}</td>
                            <td class="center-align">${item.qty}</td>
                            <td class="right-align">${currency} ${item.mrp.toFixed(2)}</td>
                            <td class="right-align">${currency} ${item.selling.toFixed(2)}</td>
                            <td class="right-align"><strong>${currency} ${item.total.toFixed(2)}</strong></td>
                        </tr>
                    `
                      )
                      .join("")}
                </tbody>
            </table>

            <div class="billing-summary-container">
                <table class="billing-summary-table">
                    <tr>
                        <td>Items Subtotal:</td>
                        <td class="right-align">${currency} ${order.subTotal.toFixed(2)}</td>
                    </tr>
                    ${
                      order.couponDiscount > 0
                        ? `
                    <tr style="color: #ef4444;">
                        <td>Coupon Discount:</td>
                        <td class="right-align">-${currency} ${order.couponDiscount.toFixed(2)}</td>
                    </tr>`
                        : ""
                    }
                    <tr>
                        <td>Delivery Partner Fee:</td>
                        <td class="right-align">${order.deliveryFee === 0 ? "FREE" : `${currency} ${order.deliveryFee.toFixed(2)}`}</td>
                    </tr>
                    ${
                      order.packagingFee > 0
                        ? `
                    <tr>
                        <td>Bag & Packaging Fee:</td>
                        <td class="right-align">${currency} ${order.packagingFee.toFixed(2)}</td>
                    </tr>`
                        : ""
                    }
                    ${
                      order.weightSurcharge > 0
                        ? `
                    <tr>
                        <td>Heavy Item Surcharge:</td>
                        <td class="right-align">${currency} ${order.weightSurcharge.toFixed(2)}</td>
                    </tr>`
                        : ""
                    }
                    ${
                      order.codHandlingCharge > 0
                        ? `
                    <tr>
                        <td>COD Handling Fee:</td>
                        <td class="right-align">${currency} ${order.codHandlingCharge.toFixed(2)}</td>
                    </tr>`
                        : ""
                    }

                    ${
                      order.walletDeduction > 0
                        ? `
                    <tr style="color: #0f766e;">
                        <td>Wallet Deduction:</td>
                        <td class="right-align">-${currency} ${order.walletDeduction.toFixed(2)}</td>
                    </tr>`
                        : ""
                    }
                    <tr class="total-row">
                        <td>Grand Total:</td>
                        <td class="right-align">${currency} ${order.finalTotal.toFixed(2)}</td>
                    </tr>
                    ${
                      order.savings > 0
                        ? `
                    <tr>
                        <td colspan="2" class="right-align savings-badge">
                            ✨ You saved ${currency} ${order.savings.toFixed(2)} on this order!
                        </td>
                    </tr>`
                        : ""
                    }
                </table>
            </div>

            <div class="declaration-section">
                <strong>Important Notice & Deliveries Policy:</strong><br>
                - This copy is generated to provide basket pricing splits and transaction records for orders fulfilled by SnapCart.<br>
                - Returns and refund clearances are processed instantly into your SnapCart wallet. To check your status, navigate to Profile → Wallet dashboard.
            </div>

            <div class="page-footer">
                <span>Page 1 of 2</span>
                <span>SnapCart Online Grocery Deliveries</span>
            </div>
        </div>

        <!-- PAGE 2: OFFICIAL COMMERCIAL TAX INVOICE -->
        <div class="page">
            <div class="header-container">
                <div class="brand-logo">
                    <span>🛒</span> SnapCart Retail
                </div>
                <div class="invoice-title">
                    <h1>TAX INVOICE</h1>
                    <p>GST Compliant Commercial Bill</p>
                </div>
            </div>

            <div class="addresses-grid">
                <div class="address-box">
                    <h3>Seller Details</h3>
                    <p><strong>${storeDetails.name} Private Limited</strong></p>
                    <p>${storeDetails.address}</p>
                    <p>${storeDetails.city}, ${storeDetails.state} - ${storeDetails.pincode}</p>
                    <p><strong>GSTIN: ${storeDetails.gstin}</strong></p>
                </div>
                <div class="address-box">
                    <h3>Buyer Details</h3>
                    <p><strong>${order.deliveryAddress.fullName}</strong></p>
                    <p>${order.deliveryAddress.fullAddress}</p>
                    <p>${order.deliveryAddress.city}, ${order.deliveryAddress.state} - ${order.deliveryAddress.pincode}</p>
                    <p>Place of Supply: ${order.deliveryAddress.state} (State Code: ${order.deliveryAddress.pincode.slice(0, 2)})</p>
                </div>
            </div>

            <div class="metadata-bar">
                <div class="metadata-item">
                    <span class="label">Invoice Number</span>
                    <span class="value">TXN-${order.orderNumber}</span>
                </div>
                <div class="metadata-item">
                    <span class="label">Invoice Date</span>
                    <span class="value">${new Date(order.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}</span>
                </div>
                <div class="metadata-item">
                    <span class="label">Supply Date</span>
                    <span class="value">${new Date(order.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}</span>
                </div>
                <div class="metadata-item">
                    <span class="label">Reverse Charge</span>
                    <span class="value">NO</span>
                </div>
            </div>

            <h3 style="font-size: 11px; font-weight: 800; color: #1e293b; margin: 10px 0;">INVOICED GOODS & SERVICES</h3>
            <table class="items-table">
                <thead>
                    <tr>
                        <th style="width: 4%">#</th>
                        <th>Description of Supply</th>
                        <th class="center-align" style="width: 10%">HSN</th>
                        <th class="center-align" style="width: 8%">Qty</th>
                        <th class="right-align" style="width: 12%">Rate (₹)</th>
                        <th class="right-align" style="width: 14%">Taxable Value (₹)</th>
                        <th class="center-align" style="width: 10%">GST %</th>
                        <th class="right-align" style="width: 12%">CGST (₹)</th>
                        <th class="right-align" style="width: 12%">SGST (₹)</th>
                        <th class="right-align" style="width: 14%">Total (₹)</th>
                    </tr>
                </thead>
                <tbody>
                    <!-- Processed Products List -->
                    ${processedItems
                      .map(
                        (item) => `
                        <tr>
                            <td class="center-align">${item.sNo}</td>
                            <td>${item.name} (${item.label})</td>
                            <td class="center-align">${item.hsn}</td>
                            <td class="center-align">${item.qty}</td>
                            <td class="right-align">${item.selling.toFixed(2)}</td>
                            <td class="right-align">${item.taxableValue.toFixed(2)}</td>
                            <td class="center-align">${item.gstRate}%</td>
                            <td class="right-align">${item.cgstAmount.toFixed(2)}</td>
                            <td class="right-align">${item.sgstAmount.toFixed(2)}</td>
                            <td class="right-align">${item.total.toFixed(2)}</td>
                        </tr>
                    `
                      )
                      .join("")}
                    
                    <!-- Fulfillments and Fees (Service GST 18% Inclusive) -->
                    ${
                      activeFeeBase > 0
                        ? `
                        <tr>
                            <td class="center-align">${processedItems.length + 1}</td>
                            <td>Delivery & Support Services (Packaging, Weight, COD Fees)</td>
                            <td class="center-align">996412</td>
                            <td class="center-align">1</td>
                            <td class="right-align">${(activeFeeBase / 1.18).toFixed(2)}</td>
                            <td class="right-align">${(activeFeeBase / 1.18).toFixed(2)}</td>
                            <td class="center-align">18%</td>
                            <td class="right-align">${serviceCgst.toFixed(2)}</td>
                            <td class="right-align">${serviceSgst.toFixed(2)}</td>
                            <td class="right-align">${activeFeeBase.toFixed(2)}</td>
                        </tr>`
                        : ""
                    }
                </tbody>
            </table>

            <div class="billing-summary-container">
                <table class="billing-summary-table" style="width: 280px;">
                    <tr>
                        <td>Total Taxable Value:</td>
                        <td class="right-align">${currency} ${(
                          processedItems.reduce((sum, i) => sum + i.taxableValue, 0) + 
                          (activeFeeBase > 0 ? (activeFeeBase / 1.18) : 0)
                        ).toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td>Total CGST (Central Tax):</td>
                        <td class="right-align">${currency} ${(
                          processedItems.reduce((sum, i) => sum + i.cgstAmount, 0) + 
                          (activeFeeBase > 0 ? serviceCgst : 0)
                        ).toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td>Total SGST (State Tax):</td>
                        <td class="right-align">${currency} ${(
                          processedItems.reduce((sum, i) => sum + i.sgstAmount, 0) + 
                          (activeFeeBase > 0 ? serviceSgst : 0)
                        ).toFixed(2)}</td>
                    </tr>
                    ${
                      order.couponDiscount > 0
                        ? `
                    <tr style="color: #ef4444;">
                        <td>Coupon Discount:</td>
                        <td class="right-align">-${currency} ${order.couponDiscount.toFixed(2)}</td>
                    </tr>`
                        : ""
                    }
                    ${
                      order.walletDeduction > 0
                        ? `
                    <tr style="color: #0f766e;">
                        <td>Wallet Deduction:</td>
                        <td class="right-align">-${currency} ${order.walletDeduction.toFixed(2)}</td>
                    </tr>`
                        : ""
                    }
                    <tr class="total-row">
                        <td>Invoice Total (Grand Total):</td>
                        <td class="right-align">${currency} ${order.finalTotal.toFixed(2)}</td>
                    </tr>
                </table>
            </div>

            <div class="declaration-section" style="margin-top: 40px;">
                <strong>GST Declaration & Corporate Info:</strong><br>
                - We hereby declare that this invoice shows the actual price of the goods and services described and that all particulars are true and correct.<br>
                - <strong>This is a computer generated commercial tax invoice and does not require any signature or brand stamp.</strong>
            </div>

            <div class="page-footer">
                <span>Page 2 of 2</span>
                <span>GST Tax Invoice System</span>
            </div>
        </div>
    </body>
    </html>
  `;

  // Launch puppeteer and generate PDF
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: "networkidle0" });
  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: {
      top: "0px",
      right: "0px",
      bottom: "0px",
      left: "0px",
    },
  });
  await browser.close();

  return Buffer.from(pdfBuffer);
}
