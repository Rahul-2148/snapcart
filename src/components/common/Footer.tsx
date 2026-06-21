"use client";

import Link from "next/link";
import {
  Mail,
  Phone,
  MapPin,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Youtube,
  Copy,
  Check,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function Footer() {
  const START_YEAR = 2026;
  const [yearText, setYearText] = useState(`@${START_YEAR}`);
  const [copied, setCopied] = useState(false);
  const emailAddress = "support@snapcart.app";
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Set year text only on client side to avoid hydration mismatch
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const year =
      START_YEAR === currentYear
        ? `@${currentYear}`
        : `@${START_YEAR}-${currentYear}`;
    setYearText(year);
  }, []);
  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(emailAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      // no-op
    }
  };

  const handleSubscribe = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const email = newsletterEmail.trim();
    setEmailError(null);
    if (!email) {
      setEmailError("Please enter an email");
      toast.error("Please enter an email");
      return;
    }
    const valid = /[^@\s]+@[^@\s]+\.[^@\s]+/.test(email);
    if (!valid) {
      setEmailError("Please enter a valid email address");
      toast.error("Please enter a valid email address");
      return;
    }
    try {
      setIsSubscribing(true);
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data?.success) {
        toast.success(data?.message || "Subscribed successfully");
        setNewsletterEmail("");
      } else {
        toast.error(data?.message || "Subscription failed");
      }
    } catch (err) {
      toast.error("Network error. Please try again.");
    } finally {
      setIsSubscribing(false);
    }
  };

  return (
    <footer className="mt-8 border-t border-gray-200 bg-white">
      {/* Top CTA strip */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-center md:text-left text-sm sm:text-base font-medium">
            Fresh groceries delivered in 10 minutes. Try Snapcart today!
          </p>
          <Link
            href="/user/products"
            className="inline-flex items-center rounded-full bg-white text-green-700 px-4 py-2 text-sm font-semibold shadow-sm hover:bg-green-50 transition"
          >
            Start Shopping
          </Link>
        </div>
      </div>

      {/* Main footer content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-green-600" />
              <span className="text-xl font-extrabold tracking-tight">
                Snapcart
              </span>
            </div>
            <p className="mt-4 text-sm text-gray-600">
              Your neighborhood grocery store—online. From daily essentials to
              fresh produce, we deliver fast and reliably.
            </p>
            {/* Social */}
            <div className="mt-6 flex items-center gap-3">
              <SocialIcon href="#" label="Facebook" brandColor="facebook">
                <Facebook size={18} />
              </SocialIcon>
              <SocialIcon href="#" label="Instagram" brandColor="instagram">
                <Instagram size={18} />
              </SocialIcon>
              <SocialIcon href="#" label="Twitter" brandColor="twitter">
                <Twitter size={18} />
              </SocialIcon>
              <SocialIcon href="#" label="LinkedIn" brandColor="linkedin">
                <Linkedin size={18} />
              </SocialIcon>
              <SocialIcon href="#" label="YouTube" brandColor="youtube">
                <Youtube size={18} />
              </SocialIcon>
            </div>
          </div>

          {/* Shop */}
          <FooterColumn title="Shop">
            <FooterLink href="/user/products">All Products</FooterLink>
            <FooterLink href="/user/products?category=fruits">
              Fruits & Vegetables
            </FooterLink>
            <FooterLink href="/user/products?category=dairy">
              Dairy & Bakery
            </FooterLink>
            <FooterLink href="/user/products?category=snacks">
              Snacks & Beverages
            </FooterLink>
            <FooterLink href="/user/products?category=household">
              Household Essentials
            </FooterLink>
          </FooterColumn>

          {/* Company */}
          <FooterColumn title="Company">
            <FooterLink href="/">Home</FooterLink>
            <FooterLink href="/register">Create Account</FooterLink>
            <FooterLink href="/login">Login</FooterLink>
            <FooterLink href="/user/orders">My Orders</FooterLink>
            <FooterLink href="/user/returns">Returns</FooterLink>
            <FooterLink href="/user/careers">Careers</FooterLink>
          </FooterColumn>

          {/* Support */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Support</h3>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex items-start gap-3 text-gray-700">
                <Phone className="mt-0.5 h-5 w-5 text-gray-500" />
                <a href="tel:+919973162148" className="hover:text-green-700">
                  +91 99731-62148
                </a>
              </li>
              <li className="flex items-start gap-3 text-gray-700">
                <Mail className="mt-0.5 h-5 w-5 text-gray-500" />
                <a
                  href={`mailto:${emailAddress}`}
                  className="hover:text-green-700 hover:underline underline-offset-2 transition cursor-pointer"
                  title="Email support"
                >
                  {emailAddress}
                </a>
                <button
                  type="button"
                  suppressHydrationWarning
                  onClick={handleCopyEmail}
                  aria-label="Copy email"
                  title={copied ? "Copied" : "Copy email"}
                  className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded border border-gray-300 text-gray-600 hover:text-green-700 hover:border-green-700 transition"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </li>
              <li className="flex items-start gap-3 text-gray-700">
                <MapPin className="mt-0.5 h-5 w-5 text-gray-500" />
                <span>Koderma, Jharkhand, India</span>
              </li>
            </ul>

            {/* Newsletter */}
            <form
              className="mt-6 flex items-center gap-2"
              onSubmit={handleSubscribe}
            >
              <input
                type="email"
                suppressHydrationWarning
                placeholder="Subscribe with email"
                aria-label="Newsletter email"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                {...(emailError ? { "aria-invalid": "true" as const } : {})}
                aria-describedby={
                  emailError ? "newsletter-email-error" : undefined
                }
                className={`flex-1 rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-600 ${emailError ? "border-red-400" : "border-gray-300"}`}
              />
              <button
                type="submit"
                disabled={isSubscribing}
                suppressHydrationWarning
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubscribing ? "Subscribing..." : "Subscribe"}
              </button>
            </form>
            <p
              id="newsletter-email-error"
              className="mt-1 text-xs text-red-600"
            >
              {emailError}
            </p>
            <p className="mt-2 text-xs text-gray-500">
              We’ll send a confirmation email to verify your subscription.
            </p>

            {/* Payments */}
            <div className="mt-6">
              <p className="text-xs font-medium text-gray-500">We accept</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge>UPI</Badge>
                <Badge>RuPay</Badge>
                <Badge>Visa</Badge>
                <Badge>Mastercard</Badge>
                <Badge>NetBanking</Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 border-t border-gray-200 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            {yearText} Snapcart. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-gray-600">
            <Link href="/" className="hover:text-gray-900">
              Privacy
            </Link>
            <Link href="/" className="hover:text-gray-900">
              Terms
            </Link>
            <Link href="/" className="hover:text-gray-900">
              Refunds
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      <ul className="mt-4 space-y-2 text-sm">{children}</ul>
    </div>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link href={href} className="text-gray-700 hover:text-green-700">
        {children}
      </Link>
    </li>
  );
}

function SocialIcon({
  href,
  label,
  brandColor,
  children,
}: {
  href: string;
  label: string;
  brandColor?: "facebook" | "instagram" | "twitter" | "linkedin" | "youtube";
  children: React.ReactNode;
}) {
  const colorClasses: Record<string, string> = {
    facebook: "text-blue-600 border-blue-600 hover:text-blue-700 hover:border-blue-700",
    instagram: "text-pink-600 border-pink-600 hover:text-pink-700 hover:border-pink-700",
    twitter: "text-sky-500 border-sky-500 hover:text-sky-600 hover:border-sky-600",
    linkedin: "text-blue-700 border-blue-700 hover:text-blue-800 hover:border-blue-800",
    youtube: "text-red-600 border-red-600 hover:text-red-700 hover:border-red-700",
  };

  const classes = brandColor ? colorClasses[brandColor] : "text-gray-700 hover:text-green-700 hover:border-green-700 border-gray-200";

  return (
    <Link
      aria-label={label}
      href={href}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full border ${classes} transition`}
    >
      {children}
    </Link>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md border border-gray-300 bg-gray-50 px-2 py-1 text-[11px] font-medium text-gray-700">
      {children}
    </span>
  );
}
