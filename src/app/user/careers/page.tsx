// src/app/user/careers/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Briefcase,
  MapPin,
  Clock,
  ChevronRight,
  X,
  Award,
  Users,
  CheckCircle2,
  UploadCloud,
  Globe,
  BookOpen,
  Heart,
  AlertCircle,
  FileText,
  Linkedin,
  Keyboard,
  Sparkles,
  ArrowRight,
  TrendingUp,
  FileCheck
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";

interface Vacancy {
  id: string;
  title: string;
  department: string;
  location: string;
  type: string;
  experience: string;
  salary: string;
  description: string;
  requirements: string[];
}

const VACANCIES: Vacancy[] = [
  {
    id: "sde2-backend",
    title: "Software Development Engineer II (Backend)",
    department: "Engineering",
    location: "Remote / Koderma, Jharkhand",
    type: "Full-Time",
    experience: "2+ Years",
    salary: "Competitive (Top-of-market)",
    description: "Scale our low-latency inventory engine, pricing logic, and routing algorithms to support high-throughput checkout loads during flash operations.",
    requirements: [
      "Extensive experience with Node.js, Next.js, and TypeScript.",
      "In-depth knowledge of MongoDB (indexing, aggregations, schemas).",
      "Solid understanding of WebSockets and real-time messaging/queues.",
      "Experience deploying to AWS, Vercel, or similar cloud infrastructure.",
      "A passion for performance optimization and clean, reusable code structures."
    ]
  },
  {
    id: "uiux-designer",
    title: "Product Designer (UI/UX)",
    department: "Design",
    location: "Hybrid (Koderma, Jharkhand)",
    type: "Full-Time",
    experience: "1+ Years",
    salary: "Competitive",
    description: "Design premium consumer layouts, dark store warehouse portals, and real-time delivery rider dashboards that drive order speed and accuracy.",
    requirements: [
      "Strong portfolio demonstrating human-centered interface designs and polished UI aesthetics.",
      "Proficient in Figma, prototyping tools, and asset delivery pipelines.",
      "Familiarity with Tailwind CSS, design systems, and frontend components integration.",
      "Ability to translate user analytics and feedback into high-fidelity mockups.",
      "Excellent communication skills for cross-functional pair-programming and design reviews."
    ]
  },
  {
    id: "darkstore-ops",
    title: "Operations Lead (Dark Store Network)",
    department: "Operations",
    location: "Koderma, Jharkhand (On-site)",
    type: "Full-Time",
    experience: "3+ Years",
    salary: "Competitive",
    description: "Overlook local dark store operations, packing times, shopper performance, and live logistics to guarantee deliveries in under 10 minutes.",
    requirements: [
      "Prior experience in warehouse management, logistics coordination, or retail inventory control.",
      "Proven track record of managing shifts and organizing large shopper/packer teams.",
      "Strong analytical skills to monitor packaging SLA times and minimize out-of-stock occurrences.",
      "Comfortable working in a dynamic environment under strict real-time deadlines.",
      "Ability to coordinate with delivery partner networks for peak demand forecasting."
    ]
  },
  {
    id: "marketing-analyst",
    title: "Senior Growth Marketing Analyst",
    department: "Marketing",
    location: "Remote",
    type: "Full-Time",
    experience: "2+ Years",
    salary: "Competitive",
    description: "Drive user retention and acquisition strategies by designing data-driven referral programs, coupon schemes, and localized marketing campaigns.",
    requirements: [
      "Strong background in digital marketing analytics (Google Analytics, Mixpanel, Amplitude).",
      "Experience optimizing paid search, social campaigns, and localized offline banners.",
      "Familiarity with e-commerce discount modeling and user lifetime value calculations.",
      "Excellent SQL skills for database queries and cohort analysis.",
      "Creative mindset for designing highly targeted marketing newsletters and push alerts."
    ]
  }
];

const BLOGS = [
  {
    id: "eng-blog",
    title: "Syncing 10,000 SKUs in Real-Time",
    category: "Engineering",
    readTime: "5 min read",
    author: "Snapcart Tech Team",
    date: "June 18, 2026",
    summary: "Discover how our engineering team optimized MongoDB indexes and coordinate range queries to sync catalog inventories with under 200ms latency."
  },
  {
    id: "design-blog",
    title: "Designing for Instant Gratification",
    category: "Design",
    readTime: "4 min read",
    author: "Growth Design Lead",
    date: "June 12, 2026",
    summary: "An in-depth look into our interface updates, focusing on micro-interactions, dark-mode toggles, and simplified checkout flows that reduced cart abandonment by 14%."
  },
  {
    id: "ops-blog",
    title: "The Backbone of 10-Minute Delivery",
    category: "Operations",
    readTime: "6 min read",
    author: "Operations Director",
    date: "May 28, 2026",
    summary: "Step inside our regional dark stores and learn about the custom packing boards, SLA tracking bells, and logistics routing that power India's fastest delivery network."
  }
];

// 1. LIGHTWEIGHT VIEWPORT-AWARE ANIMATED COUNTER
function AnimatedCounter({
  value,
  suffix = "",
  duration = 1500,
  isFloat = false
}: {
  value: number;
  suffix?: string;
  duration?: number;
  isFloat?: boolean;
}) {
  const [count, setCount] = useState(0);
  const elementRef = useRef<HTMLDivElement>(null);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasStarted(true);
        }
      },
      { threshold: 0.1 }
    );
    if (elementRef.current) observer.observe(elementRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!hasStarted) return;
    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setCount(progress * value);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [hasStarted, value, duration]);

  return (
    <span ref={elementRef} className="tabular-nums">
      {isFloat ? count.toFixed(1) : Math.floor(count).toLocaleString()}
      {suffix}
    </span>
  );
}

export default function CareersPage() {
  const [selectedDept, setSelectedDept] = useState<string>("All");
  const [selectedVacancy, setSelectedVacancy] = useState<Vacancy | null>(null);
  
  // Application form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [currentTitle, setCurrentTitle] = useState("");
  const [experience, setExperience] = useState("");
  const [skills, setSkills] = useState("");
  const [education, setEducation] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  
  // Advanced application flow states
  const [applyMethod, setApplyMethod] = useState<"resume" | "linkedin" | "manual" | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parsingStep, setParsingStep] = useState("");
  const [autofillSource, setAutofillSource] = useState<"Resume" | "LinkedIn" | null>(null);
  const [linkedinInputUrl, setLinkedinInputUrl] = useState("");
  const [isSyncingLinkedin, setIsSyncingLinkedin] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const departments = ["All", "Engineering", "Design", "Operations", "Marketing"];

  const filteredVacancies = selectedDept === "All" 
    ? VACANCIES 
    : VACANCIES.filter(v => v.department === selectedDept);

  const handleOpenApply = (vacancy: Vacancy) => {
    setSelectedVacancy(vacancy);
    setApplyMethod(null);
    setSubmitted(false);
    setErrorMsg(null);
    setFileName(null);
    setUploadProgress(null);
    setIsParsing(false);
    setAutofillSource(null);
    setLinkedinInputUrl("");
    setIsSyncingLinkedin(false);
    
    // Reset Form Fields
    setName("");
    setEmail("");
    setMobile("");
    setCurrentTitle("");
    setExperience("");
    setSkills("");
    setEducation("");
    setResumeUrl("");
    setLinkedinUrl("");
    setCoverLetter("");
  };

  // Mock File Drag & Drop Handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processResumeUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processResumeUpload(e.target.files[0]);
    }
  };

  // Simulate file upload and Mock AI resume parsing
  const processResumeUpload = (file: File) => {
    setFileName(file.name);
    setUploadProgress(0);
    setErrorMsg(null);

    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev === null) return 0;
        if (prev >= 100) {
          clearInterval(interval);
          // Trigger mock parsing
          triggerMockParsing(file.name);
          return 100;
        }
        return prev + 10;
      });
    }, 100);
  };

  const triggerMockParsing = (filename: string) => {
    setIsParsing(true);
    setParsingStep("Initializing secure AI processor...");
    
    setTimeout(() => {
      setParsingStep("Analyzing CV document vectors & text segments...");
    }, 600);

    setTimeout(() => {
      setParsingStep("Extracting applicant metadata, degree paths & core skills...");
    }, 1200);

    setTimeout(() => {
      // Completed parsing! Pre-fill fields with professional data
      setName("Rahul Raj Modi");
      setEmail("rahul.modi@snapcart.app");
      setMobile("+91 99731 62148");
      
      // Select prefilled values depending on vacancy
      if (selectedVacancy?.department === "Engineering") {
        setCurrentTitle("Full Stack Next.js Developer");
        setExperience("2+ Years");
        setSkills("React, Next.js, Node.js, TypeScript, MongoDB, Tailwind CSS, API Design");
      } else if (selectedVacancy?.department === "Design") {
        setCurrentTitle("Product UI/UX Designer");
        setExperience("1+ Years");
        setSkills("Figma, Product Design, Prototyping, Component Systems, Wireframing");
      } else if (selectedVacancy?.department === "Operations") {
        setCurrentTitle("Logistics Associate");
        setExperience("3+ Years");
        setSkills("Warehouse Management, Dark store networks, Pack operations, SLA tracking");
      } else {
        setCurrentTitle("Growth Analyst");
        setExperience("2+ Years");
        setSkills("Google Analytics, SQL, Mixpanel, Excel modeling, Campaign growth");
      }
      
      setEducation("B.Tech in Computer Science & Engineering");
      setResumeUrl(`https://snapcart-resumes.s3.amazonaws.com/cv-${encodeURIComponent(filename)}`);
      setLinkedinUrl("https://linkedin.com/in/rahulrajmodi");
      setCoverLetter(`I am highly thrilled to apply for the ${selectedVacancy?.title} vacancy. I possess rich experience in this domain and would love to contribute towards building India's fastest delivery network.`);
      
      setIsParsing(false);
      setAutofillSource("Resume");
      setApplyMethod("manual"); // transition to form view but pre-filled!
      toast.success("Resume parsed successfully! Fields auto-filled.");
    }, 2000);
  };

  // Mock LinkedIn Sync Flow
  const handleLinkedinSync = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkedinInputUrl.trim()) return;

    setIsSyncingLinkedin(true);
    setErrorMsg(null);

    setTimeout(() => {
      // Pre-fill form fields using mock LinkedIn node extraction
      setName("Rahul Raj Modi");
      setEmail("rahul.modi@snapcart.app");
      setMobile("+91 99731 62148");
      
      if (selectedVacancy?.department === "Engineering") {
        setCurrentTitle("Senior Web Developer");
        setExperience("2.5 Years");
        setSkills("React, Next.js, Redux, Node.js, WebSockets, MongoDB, AWS");
      } else if (selectedVacancy?.department === "Design") {
        setCurrentTitle("UI/UX Designer");
        setExperience("1.5 Years");
        setSkills("Figma, Interface Design, Design System Engineering, User Research");
      } else {
        setCurrentTitle("Operations Lead");
        setExperience("3.5 Years");
        setSkills("Operations, SLA management, Team leadership, Inventory control");
      }

      setEducation("Bachelor of Technology (CSE)");
      setResumeUrl("https://snapcart-resumes.s3.amazonaws.com/linkedin-generated-cv.pdf");
      setLinkedinUrl(linkedinInputUrl);
      setCoverLetter(`Applying for the ${selectedVacancy?.title} role via LinkedIn profile sync. Excited about Snapcart's hyper-growth trajectory!`);
      
      setIsSyncingLinkedin(false);
      setAutofillSource("LinkedIn");
      setApplyMethod("manual"); // transition to pre-filled form
      toast.success("LinkedIn profile synced! Form pre-filled.");
    }, 1500);
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVacancy) return;

    if (!name.trim() || !email.trim() || !mobile.trim() || !resumeUrl.trim()) {
      setErrorMsg("Name, Email, Mobile, and Resume Link are mandatory.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/careers/apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          mobile,
          position: selectedVacancy.title,
          currentTitle,
          experience,
          skills,
          education,
          resumeUrl,
          linkedinUrl,
          coverLetter,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
        toast.success("Application submitted successfully!");
      } else {
        setErrorMsg(data.message || "Failed to submit application.");
        toast.error(data.message || "Submission failed");
      }
    } catch (err) {
      setErrorMsg("Something went wrong. Please check your internet connection.");
      toast.error("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen text-gray-800 selection:bg-green-100 selection:text-green-800">
      
      {/* 1. HERO SECTION - Ultra Modern Glassmorphism layout */}
      <section className="relative bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white overflow-hidden py-20 md:py-28">
        {/* Animated background overlays */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(16,185,129,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(5,150,105,0.08),transparent_50%)]" />
        
        <div className="max-w-6xl mx-auto px-4 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-6 backdrop-blur-md"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            Join the Snapcart Crew
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight"
          >
            Shape the Future of <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-green-400 to-teal-300">
              Instant Commerce
            </span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-6 text-sm md:text-base text-slate-300 max-w-xl mx-auto leading-relaxed font-medium"
          >
            We are building logistics rails, custom-engineered dark stores, and low-latency inventory algorithms to deliver fresh groceries across India in 10 minutes.
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-10 flex flex-wrap justify-center gap-4"
          >
            <a
              href="#vacancies"
              className="px-6 py-3 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold shadow-lg shadow-emerald-950/30 hover:scale-[1.02] transition-all"
            >
              Browse Openings
            </a>
            <a
              href="#life-at-snapcart"
              className="px-6 py-3 rounded-full bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold shadow backdrop-blur-sm transition-all"
            >
              Inside Snapcart
            </a>
          </motion.div>
        </div>
      </section>

      {/* 2. STATS SECTION - Real-time animated counters */}
      <section className="py-12 bg-white border-b border-gray-100 shadow-sm relative z-20 -mt-6 max-w-5xl mx-auto rounded-2xl">
        <div className="px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="p-2 md:border-r border-gray-100 last:border-0">
              <p className="text-3xl md:text-4xl font-extrabold text-green-600">
                <AnimatedCounter value={10} suffix=" Min" />
              </p>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">Delivery Target</p>
            </div>
            <div className="p-2 md:border-r border-gray-100 last:border-0">
              <p className="text-3xl md:text-4xl font-extrabold text-green-600">
                <AnimatedCounter value={50} suffix="+" />
              </p>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">Active Dark Stores</p>
            </div>
            <div className="p-2 md:border-r border-gray-100 last:border-0">
              <p className="text-3xl md:text-4xl font-extrabold text-green-600">
                <AnimatedCounter value={500} suffix="+" />
              </p>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">Active Riders</p>
            </div>
            <div className="p-2">
              <p className="text-3xl md:text-4xl font-extrabold text-green-600">
                <AnimatedCounter value={1.0} suffix="M+" isFloat={true} />
              </p>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">Orders Fulfilled</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. CORE VALUES - Premium glass design */}
      <section className="py-20 bg-gray-50/50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center max-w-xl mx-auto">
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Our Cultural Anchors</h2>
            <p className="text-sm text-gray-500 mt-2">
              We focus on building robust infrastructures and empowering individuals to operate with complete ownership.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            <div className="p-8 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition duration-300 relative group overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-green-500 rounded-l-2xl group-hover:scale-y-110 transition" />
              <div className="h-12 w-12 rounded-xl bg-green-50 flex items-center justify-center text-green-600 mb-6 font-bold">
                <Award className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg">High-Execution Environment</h3>
              <p className="text-xs text-gray-600 mt-3 leading-relaxed">
                Scale real-time checkout engines, route mappings, and stocking tools. There's no bureaucratic overhead—we values metrics and execution speed above all.
              </p>
            </div>
            <div className="p-8 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition duration-300 relative group overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500 rounded-l-2xl group-hover:scale-y-110 transition" />
              <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-6 font-bold">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg">Merit & Autonomy</h3>
              <p className="text-xs text-gray-600 mt-3 leading-relaxed">
                We believe the best idea wins. Teams operate as small startup pods with the freedom to define targets, test solutions, and fail fast.
              </p>
            </div>
            <div className="p-8 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition duration-300 relative group overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-teal-500 rounded-l-2xl group-hover:scale-y-110 transition" />
              <div className="h-12 w-12 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 mb-6 font-bold">
                <Heart className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg">Top Tier Compensation</h3>
              <p className="text-xs text-gray-600 mt-3 leading-relaxed">
                Compensating talent at the highest level. We provide top-of-market base pay, comprehensive health policies, and flexible stock packages.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. OPENINGS BOARD */}
      <section id="vacancies" className="py-20 bg-white border-t border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center max-w-xl mx-auto">
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Open Workstations</h2>
            <p className="text-sm text-gray-500 mt-2">Browse open vacancies and sync your resume for immediate review.</p>
          </div>

          {/* Department Filters */}
          <div className="flex flex-wrap justify-center gap-2 mt-8">
            {departments.map((dept) => (
              <button
                key={dept}
                type="button"
                onClick={() => setSelectedDept(dept)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  selectedDept === dept
                    ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-md shadow-green-600/10"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {dept}
              </button>
            ))}
          </div>

          {/* Vacancies Display */}
          <div className="mt-12 space-y-4">
            {filteredVacancies.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                <AlertCircle className="w-8 h-8 text-gray-400 mx-auto" />
                <p className="text-gray-500 font-bold mt-3">No active listings in this department.</p>
                <p className="text-xs text-gray-400 mt-1">Sign up to our newsletter for instant recruitment updates.</p>
              </div>
            ) : (
              filteredVacancies.map((vacancy) => (
                <div
                  key={vacancy.id}
                  className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-6 group hover:border-emerald-200"
                >
                  <div className="space-y-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-55 text-emerald-800 bg-emerald-50 text-[10px] font-extrabold uppercase tracking-wide">
                      {vacancy.department}
                    </span>
                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-emerald-700 transition">
                      {vacancy.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-gray-455 text-gray-400" />
                        {vacancy.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        {vacancy.type}
                      </span>
                      <span className="font-semibold text-slate-700">Exp: {vacancy.experience}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenApply(vacancy)}
                    className="w-full md:w-auto flex items-center justify-center gap-1 px-5 py-3 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-750 hover:to-emerald-700 text-white text-xs font-bold shadow hover:shadow-md transition duration-200"
                  >
                    Apply Now
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* 5. LIFE BLOGS */}
      <section id="life-at-snapcart" className="py-20 bg-gray-50/50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center max-w-xl mx-auto">
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Engineering & Design Journals</h2>
            <p className="text-sm text-gray-500 mt-2">Understand the technical design behind our 10-minute operation framework.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            {BLOGS.map((blog) => (
              <article
                key={blog.id}
                className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition flex flex-col h-full group"
              >
                <div className="p-6 flex-1">
                  <div className="flex items-center justify-between text-xs text-gray-400 font-bold uppercase">
                    <span className="text-emerald-600">{blog.category}</span>
                    <span>{blog.readTime}</span>
                  </div>
                  <h3 className="font-extrabold text-gray-900 text-base mt-4 leading-snug group-hover:text-green-700 transition cursor-pointer">
                    {blog.title}
                  </h3>
                  <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                    {blog.summary}
                  </p>
                </div>
                <div className="px-6 py-4 border-t border-gray-50 bg-gray-50/50 flex items-center justify-between text-[11px] text-gray-400">
                  <span>By {blog.author}</span>
                  <span>{blog.date}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 6. ADVANCED INTERACTIVE RECRUITMENT SHEET */}
      <AnimatePresence>
        {selectedVacancy && (
          <div
            className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setSelectedVacancy(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-gray-100"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-slate-50/50">
                <div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase tracking-wide">
                    {selectedVacancy.department}
                  </span>
                  <h3 className="text-base font-bold text-gray-900 mt-1">Application Hub</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedVacancy(null)}
                  className="p-1.5 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Scrollable Content */}
              <div className="flex-1 overflow-y-auto premium-scroll p-6 space-y-6">
                
                {/* Vacancy Summary */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-gray-900 text-sm">{selectedVacancy.title}</h4>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-0.5">
                        <MapPin className="w-3.5 h-3.5" />
                        {selectedVacancy.location}
                      </span>
                      <span>Experience: {selectedVacancy.experience}</span>
                      <span>Salary: {selectedVacancy.salary}</span>
                    </div>
                  </div>
                </div>

                {/* Application Flow Selection */}
                {applyMethod === null && (
                  <div className="space-y-4">
                    <div className="text-center max-w-sm mx-auto">
                      <p className="text-sm font-bold text-slate-800">Choose application flow</p>
                      <p className="text-xs text-slate-500 mt-1">Sync your professional CV or social profile to save time and auto-populate all forms.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                      {/* CV Upload Option */}
                      <button
                        type="button"
                        onClick={() => setApplyMethod("resume")}
                        className="p-5 border border-slate-200 rounded-2xl text-left hover:border-emerald-400 hover:bg-emerald-50/20 transition flex items-start gap-4"
                      >
                        <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
                          <UploadCloud className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">Instant AI CV Parser</p>
                          <p className="text-[10px] text-slate-500 mt-1">Upload your PDF or Word resume. Our AI reads skills, education, and automatically populates details.</p>
                        </div>
                      </button>

                      {/* LinkedIn Option */}
                      <button
                        type="button"
                        onClick={() => setApplyMethod("linkedin")}
                        className="p-5 border border-slate-200 rounded-2xl text-left hover:border-blue-400 hover:bg-blue-50/20 transition flex items-start gap-4"
                      >
                        <div className="h-10 w-10 rounded-lg bg-blue-55 text-blue-50 bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                          <Linkedin className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">Autofill with LinkedIn</p>
                          <p className="text-[10px] text-slate-500 mt-1">Input your LinkedIn profile link. We connect and extract professional milestones instantly.</p>
                        </div>
                      </button>
                    </div>

                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={() => setApplyMethod("manual")}
                        className="text-xs text-gray-500 hover:text-green-700 font-bold underline underline-offset-2 flex items-center justify-center gap-1 mx-auto"
                      >
                        <Keyboard className="w-3.5 h-3.5" />
                        Or type all details manually
                      </button>
                    </div>
                  </div>
                )}

                {/* 1. MOCK DRAG & DROP RESUME UPLOADER */}
                {applyMethod === "resume" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Instant CV Scan</h5>
                      <button
                        type="button"
                        onClick={() => setApplyMethod(null)}
                        className="text-xs text-slate-500 hover:text-slate-700 underline font-semibold"
                      >
                        Change flow
                      </button>
                    </div>

                    {uploadProgress === null ? (
                      <div
                        onDragEnter={handleDrag}
                        onDragOver={handleDrag}
                        onDragLeave={handleDrag}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-2xl p-8 text-center transition flex flex-col items-center justify-center gap-3 cursor-pointer ${
                          dragActive 
                            ? "border-green-500 bg-green-50/30" 
                            : "border-slate-200 hover:border-emerald-400 hover:bg-slate-50/20"
                        }`}
                      >
                        <input
                          type="file"
                          id="cv-file-picker"
                          accept=".pdf,.doc,.docx"
                          className="hidden"
                          onChange={handleFileChange}
                        />
                        <label htmlFor="cv-file-picker" className="cursor-pointer flex flex-col items-center gap-3">
                          <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100 shadow-sm">
                            <UploadCloud className="w-6 h-6 text-slate-500" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">Drag and drop your CV file here</p>
                            <p className="text-[10px] text-slate-400 mt-1">Supports PDF, DOCX, DOC files up to 5MB.</p>
                          </div>
                          <span className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-full text-xs font-bold text-slate-700 transition">
                            Browse Files
                          </span>
                        </label>
                      </div>
                    ) : (
                      <div className="border border-slate-150 rounded-2xl p-6 bg-slate-50/50 space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 flex-shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">{fileName}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">Uploading document...</p>
                          </div>
                        </div>

                        {uploadProgress < 100 ? (
                          <div className="space-y-2">
                            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-green-600 h-full rounded-full transition-all duration-100" style={{ width: `${uploadProgress}%` }} />
                            </div>
                            <div className="flex justify-between text-[10px] text-slate-500 font-semibold">
                              <span>Uploading...</span>
                              <span>{uploadProgress}%</span>
                            </div>
                          </div>
                        ) : isParsing ? (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 animate-pulse">
                              <Sparkles className="w-4 h-4 animate-spin text-emerald-600" />
                              <span>{parsingStep}</span>
                            </div>
                            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-emerald-500 h-full rounded-full animate-[loading_2s_infinite]" style={{ width: "40%" }} />
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Resume uploaded and parsed successfully!</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 2. MOCK LINKEDIN SYNC */}
                {applyMethod === "linkedin" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wide">LinkedIn Profile Autofill</h5>
                      <button
                        type="button"
                        onClick={() => setApplyMethod(null)}
                        className="text-xs text-slate-500 hover:text-slate-700 underline font-semibold"
                      >
                        Change flow
                      </button>
                    </div>

                    <form onSubmit={handleLinkedinSync} className="p-6 border border-blue-100 bg-blue-50/10 rounded-2xl space-y-4">
                      <div className="flex items-start gap-4">
                        <div className="h-10 w-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 flex-shrink-0">
                          <Linkedin className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <label htmlFor="linkedin-profile-input" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            LinkedIn Profile URL
                          </label>
                          <input
                            id="linkedin-profile-input"
                            type="url"
                            required
                            value={linkedinInputUrl}
                            onChange={(e) => setLinkedinInputUrl(e.target.value)}
                            placeholder="e.g. https://www.linkedin.com/in/username"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>

                      {isSyncingLinkedin ? (
                        <div className="space-y-3 pt-2">
                          <div className="flex items-center gap-2 text-xs font-bold text-blue-800 animate-pulse">
                            <Sparkles className="w-4 h-4 animate-spin text-blue-600" />
                            <span>Connecting to LinkedIn APIs and parsing profile nodes...</span>
                          </div>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-blue-500 h-full rounded-full animate-[loading_1.5s_infinite]" style={{ width: "40%" }} />
                          </div>
                        </div>
                      ) : (
                        <button
                          type="submit"
                          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow hover:shadow-md transition flex items-center justify-center gap-1.5"
                        >
                          <Linkedin className="w-4 h-4" />
                          Sync and Autofill Details
                        </button>
                      )}
                    </form>
                  </div>
                )}

                {/* 3. APPLICATION DETAILS FORM */}
                {applyMethod === "manual" && (
                  <form onSubmit={handleApplySubmit} className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        Applicant Credentials
                        {autofillSource && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[9px] font-bold uppercase animate-pulse">
                            <FileCheck className="w-3 h-3 text-emerald-600" />
                            Auto-filled by {autofillSource}
                          </span>
                        )}
                      </h5>
                      <button
                        type="button"
                        onClick={() => setApplyMethod(null)}
                        className="text-[11px] text-slate-500 hover:text-slate-700 underline font-semibold"
                      >
                        Reset Application
                      </button>
                    </div>
                    
                    {errorMsg && (
                      <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>{errorMsg}</span>
                      </div>
                    )}

                    {/* Personal Credentials */}
                    <div className="space-y-3">
                      <p className="text-xs font-bold text-slate-700 border-l-2 border-emerald-500 pl-2">1. Personal Information</p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label htmlFor="applicant-full-name" className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                            Full Name
                          </label>
                          <input
                            id="applicant-full-name"
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Full Name"
                            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          />
                        </div>
                        <div>
                          <label htmlFor="applicant-email-address" className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                            Email Address
                          </label>
                          <input
                            id="applicant-email-address"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email address"
                            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          />
                        </div>
                        <div>
                          <label htmlFor="applicant-mobile-phone" className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                            Phone Number
                          </label>
                          <input
                            id="applicant-mobile-phone"
                            type="tel"
                            required
                            value={mobile}
                            onChange={(e) => setMobile(e.target.value)}
                            placeholder="Contact number"
                            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Professional Credentials */}
                    <div className="space-y-3">
                      <p className="text-xs font-bold text-slate-700 border-l-2 border-emerald-500 pl-2">2. Professional Details</p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="applicant-job-title" className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                            Current Job Title
                          </label>
                          <input
                            id="applicant-job-title"
                            type="text"
                            value={currentTitle}
                            onChange={(e) => setCurrentTitle(e.target.value)}
                            placeholder="e.g. Frontend Developer"
                            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          />
                        </div>
                        <div>
                          <label htmlFor="applicant-experience-span" className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                            Experience Range
                          </label>
                          <select
                            id="applicant-experience-span"
                            value={experience}
                            onChange={(e) => setExperience(e.target.value)}
                            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                          >
                            <option value="">Select Range</option>
                            <option value="Fresher">Fresher / 0-1 Years</option>
                            <option value="1+ Years">1+ Years</option>
                            <option value="2+ Years">2+ Years</option>
                            <option value="3+ Years">3+ Years</option>
                            <option value="5+ Years">5+ Years</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="applicant-degree" className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                            Education / Degree
                          </label>
                          <input
                            id="applicant-degree"
                            type="text"
                            value={education}
                            onChange={(e) => setEducation(e.target.value)}
                            placeholder="e.g. B.Tech in CSE / MCA"
                            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          />
                        </div>
                        <div>
                          <label htmlFor="applicant-skills" className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                            Core Skills (Comma separated)
                          </label>
                          <input
                            id="applicant-skills"
                            type="text"
                            value={skills}
                            onChange={(e) => setSkills(e.target.value)}
                            placeholder="e.g. React, Next.js, Node.js"
                            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Resume & Social Links */}
                    <div className="space-y-3">
                      <p className="text-xs font-bold text-slate-700 border-l-2 border-emerald-500 pl-2">3. Links & Attachments</p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="applicant-resume-link" className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                            Resume Link (Google Drive / PDF Link)
                          </label>
                          <input
                            id="applicant-resume-link"
                            type="url"
                            required
                            value={resumeUrl}
                            onChange={(e) => setResumeUrl(e.target.value)}
                            placeholder="https://drive.google.com/..."
                            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          />
                        </div>
                        <div>
                          <label htmlFor="applicant-linkedin-link" className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                            LinkedIn Profile URL
                          </label>
                          <input
                            id="applicant-linkedin-link"
                            type="url"
                            value={linkedinUrl}
                            onChange={(e) => setLinkedinUrl(e.target.value)}
                            placeholder="https://linkedin.com/in/..."
                            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* SOP Statement */}
                    <div>
                      <label htmlFor="applicant-so-letter" className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                        Cover Letter / Statement of Purpose
                      </label>
                      <textarea
                        id="applicant-so-letter"
                        rows={3}
                        value={coverLetter}
                        onChange={(e) => setCoverLetter(e.target.value)}
                        placeholder="Explain why you are the best fit for this role at Snapcart..."
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
                      />
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow hover:shadow-md transition flex items-center justify-center gap-1.5"
                      >
                        <FileCheck className="w-4 h-4 animate-bounce" />
                        {submitting ? "Submitting Application Details..." : "Confirm & Submit Application"}
                      </button>
                    </div>
                  </form>
                )}

                {submitted && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100 text-center space-y-4 shadow-sm"
                  >
                    <div className="inline-flex h-14 w-14 rounded-full bg-emerald-100 text-emerald-600 items-center justify-center mx-auto">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h5 className="font-extrabold text-emerald-950 text-base">Application Received!</h5>
                    <p className="text-xs text-emerald-800 leading-relaxed max-w-sm mx-auto">
                      Thank you for applying to Snapcart! We have registered your application for **{selectedVacancy.title}**. Our recruitment team is processing your details. An update will be shared via **{email || "email"}** shortly.
                    </p>
                    <button
                      type="button"
                      onClick={() => setSelectedVacancy(null)}
                      className="mt-2 w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow transition"
                    >
                      Close Portal
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
