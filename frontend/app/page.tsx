'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Building2,
  ArrowRight,
  Shield,
  Zap,
  Users,
  FileText,
  Clock,
  Upload,
  ChevronDown,
  ChevronRight,
  Mail,
  Phone,
  MapPin,
  Globe,
  Sparkles,
  TrendingUp,
  Lock,
  Database,
  RefreshCw,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useState } from 'react';

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

const features = [
  { icon: Users, title: 'Employee Management', desc: 'Complete employee lifecycle management with detailed profiles and records.' },
  { icon: FileText, title: 'Payslip Generation', desc: 'Auto-generate professional PDF payslips with exact template matching.' },
  { icon: Upload, title: 'Salary Upload', desc: 'Bulk upload salary data via Excel or CSV with instant preview.' },
  { icon: Clock, title: 'Attendance Sync', desc: 'Automatic Jibble API integration for real-time attendance tracking.' },
  { icon: Shield, title: 'Secure & Private', desc: 'Enterprise-grade security with JWT, bcrypt, and role-based access.' },
];

const workflow = [
  { step: '01', title: 'Upload Data', desc: 'Import employee and salary data via Excel/CSV files.', icon: Upload },
  { step: '02', title: 'Sync Attendance', desc: 'Automatically sync attendance from Jibble.', icon: RefreshCw },
  { step: '03', title: 'Review & Calculate', desc: 'Auto-calculate salary components and deductions.', icon: TrendingUp },
  { step: '04', title: 'Generate Payslip', desc: 'Generate professional PDF payslips.', icon: FileText },
  { step: '05', title: 'Send & Archive', desc: 'Email payslips and store records securely.', icon: Mail },
];

const advantages = [
  { icon: Zap, title: 'Lightning Fast', desc: 'Process hundreds of payslips in seconds.' },
  { icon: Lock, title: 'Bank-Grade Security', desc: 'Encrypted data, secure authentication, role-based access.' },
  { icon: Database, title: 'PostgreSQL', desc: 'Robust relational database with full ACID compliance.' },
  { icon: Layers, title: 'Modern Stack', desc: 'Built with Next.js, TypeScript, and Prisma ORM.' },
];

const faqs = [
  { q: 'What file formats are supported for salary upload?', a: 'We support Excel (.xlsx, .xls) and CSV (.csv) formats for bulk salary uploads.' },
  { q: 'How does the attendance integration work?', a: 'The system integrates with the Jibble API to automatically sync employee attendance data including clock-in/out times, overtime, and leave records.' },
  { q: 'Can I customize the payslip template?', a: 'Yes, the generated PDF payslips follow an exact template with company logo, employee details, earnings, deductions, and professional formatting.' },
  { q: 'Is the system secure?', a: 'Absolutely. We use JWT authentication, bcrypt password hashing, Helmet security headers, rate limiting, and SQL injection protection via Prisma ORM.' },
  { q: 'Can multiple administrators use the system?', a: 'Currently, the system supports a single Super Admin account with full access to all features and settings.' },
];

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-gray-950">
      <nav className="fixed top-0 w-full bg-gray-950/80 backdrop-blur-xl border-b border-gray-800/50 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Logo" className="w-40 h-auto rounded-xl object-contain shadow-lg shadow-blue-500/25" />
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
            <a href="#features" className="hover:text-blue-400 transition-colors">Features</a>
            <a href="#workflow" className="hover:text-blue-400 transition-colors">Workflow</a>
            <a href="#advantages" className="hover:text-blue-400 transition-colors">Why Us</a>
            <a href="#faq" className="hover:text-blue-400 transition-colors">FAQ</a>
          </div>
          <Link href="/login">
            <Button className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 shadow-lg shadow-blue-500/25 btn-animate">
              <Lock className="w-4 h-4 mr-2" /> Admin Login
            </Button>
          </Link>
        </div>
      </nav>

      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="max-w-7xl mx-auto px-6 relative">
          <motion.div initial="hidden" animate="visible" variants={stagger} className="text-center max-w-4xl mx-auto">
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-blue-900/30 text-blue-300 border border-blue-700/50 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" /> Enterprise HRMS Solution
            </motion.div>
            <motion.h1 variants={fadeUp} className="text-5xl md:text-7xl font-bold text-gray-100 leading-tight">
              Professional{' '}
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Payslip Generator
              </span>
              {' '}System
            </motion.h1>
            <motion.p variants={fadeUp} className="text-lg text-gray-400 mt-6 max-w-2xl mx-auto leading-relaxed">
              Automate your HR operations with intelligent attendance sync, salary calculations, and professional PDF payslip generation — all powered by PostgreSQL.
            </motion.p>
            <motion.div variants={fadeUp} className="flex items-center justify-center gap-4 mt-10">
              <Link href="/login">
                <Button size="lg" className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 shadow-xl shadow-blue-500/25 btn-animate text-base px-8">
                  Get Started <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <a href="#features">
                <Button size="lg" variant="outline" className="text-base px-8 border-gray-700 text-gray-300 hover:bg-gray-800">
                  Learn More <ChevronDown className="w-5 h-5 ml-2" />
                </Button>
              </a>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="mt-20 relative"
          >
            <div className="bg-gray-900 rounded-2xl shadow-2xl border border-gray-800 p-6 max-w-4xl mx-auto">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl p-6 text-white">
                <div className="grid grid-cols-6 gap-4 mb-4">
                  {[
                    { label: 'Total Employees', value: '128' },
                    { label: 'Active', value: '115' },
                    { label: 'This Month', value: '115' },
                    { label: 'Generated', value: '98' },
                    { label: 'Pending', value: '17' },
                    { label: 'Files', value: '24' },
                  ].map((stat) => (
                    <div key={stat.label} className="text-center">
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <p className="text-xs opacity-80">{stat.label}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/10 rounded-lg p-3">
                    <p className="text-xs opacity-80 mb-1">Monthly Trend</p>
                    <div className="flex items-end gap-1 h-12">
                      {[40, 55, 65, 50, 70, 80].map((h, i) => (
                        <div key={i} className="flex-1 bg-white/30 rounded-t" style={{ height: `${h}%` }} />
                      ))}
                    </div>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3">
                    <p className="text-xs opacity-80 mb-1">Departments</p>
                    <div className="flex items-center gap-2 h-12">
                      {['#3b82f6', '#10b981', '#f59e0b', '#ef4444'].map((c, i) => (
                        <div key={i} className="flex-1 rounded-full" style={{ backgroundColor: c, height: `${50 + i * 12}%` }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="features" className="py-24 bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-16">
            <motion.p variants={fadeUp} className="text-blue-400 font-medium text-sm uppercase tracking-wider mb-3">Features</motion.p>
            <motion.h2 variants={fadeUp} className="text-4xl font-bold text-gray-100">Everything You Need</motion.h2>
            <motion.p variants={fadeUp} className="text-gray-400 mt-4 max-w-xl mx-auto">Complete HRMS features for managing employees, salary, attendance, and payslips.</motion.p>
          </motion.div>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div key={i} variants={fadeUp}>
                <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-full card-hover bg-gray-900 border-gray-800">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20">
                      <f.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-100 mb-2">{f.title}</h3>
                    <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section id="workflow" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-16">
            <motion.p variants={fadeUp} className="text-blue-400 font-medium text-sm uppercase tracking-wider mb-3">Workflow</motion.p>
            <motion.h2 variants={fadeUp} className="text-4xl font-bold text-gray-100">Simple 5-Step Process</motion.h2>
            <motion.p variants={fadeUp} className="text-gray-400 mt-4 max-w-xl mx-auto">From data upload to payslip delivery in 5 easy steps.</motion.p>
          </motion.div>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {workflow.map((w, i) => (
              <motion.div key={i} variants={fadeUp} className="text-center relative">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <w.icon className="w-7 h-7 text-white" />
                </div>
                <div className="text-xs font-bold text-blue-400 mb-1">{w.step}</div>
                <h3 className="font-bold text-gray-100 mb-1">{w.title}</h3>
                <p className="text-xs text-gray-500">{w.desc}</p>
                {i < workflow.length - 1 && (
                  <ChevronRight className="hidden md:block absolute top-8 -right-3 w-5 h-5 text-gray-700" />
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section id="advantages" className="py-24 bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-16">
            <motion.p variants={fadeUp} className="text-blue-400 font-medium text-sm uppercase tracking-wider mb-3">Why Choose Us</motion.p>
            <motion.h2 variants={fadeUp} className="text-4xl font-bold text-gray-100">Built for Enterprise</motion.h2>
          </motion.div>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {advantages.map((a, i) => (
              <motion.div key={i} variants={fadeUp}>
                <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 shadow-md hover:shadow-lg transition-all text-center h-full">
                  <a.icon className="w-10 h-10 mx-auto mb-4 text-blue-400" />
                  <h3 className="font-bold text-gray-100 mb-2">{a.title}</h3>
                  <p className="text-sm text-gray-400">{a.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section id="faq" className="py-24">
        <div className="max-w-3xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-16">
            <motion.p variants={fadeUp} className="text-blue-400 font-medium text-sm uppercase tracking-wider mb-3">FAQ</motion.p>
            <motion.h2 variants={fadeUp} className="text-4xl font-bold text-gray-100">Frequently Asked Questions</motion.h2>
          </motion.div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-sm overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between px-6 py-4 text-left"
                  >
                    <span className="font-medium text-gray-200 pr-4">{faq.q}</span>
                    <ChevronDown className={`w-5 h-5 text-gray-500 flex-shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                  </button>
                  {openFaq === i && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="px-6 pb-4">
                      <p className="text-sm text-gray-400 leading-relaxed">{faq.a}</p>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="py-24 bg-gradient-to-br from-blue-600 to-blue-700">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.h2 variants={fadeUp} className="text-4xl font-bold text-white">Ready to Get Started?</motion.h2>
            <motion.p variants={fadeUp} className="text-blue-100 mt-4 max-w-xl mx-auto">Streamline your HR operations with our enterprise-grade payslip generation system.</motion.p>
            <motion.div variants={fadeUp} className="flex items-center justify-center gap-4 mt-8">
              <Link href="/login">
                <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 shadow-xl btn-animate text-base px-8">
                  Start Now <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </motion.div>
            <motion.div variants={fadeUp} className="flex items-center justify-center gap-8 mt-12 text-blue-100 text-sm">
              <div className="flex items-center gap-2"><Mail className="w-4 h-4" /> hr@shinecraft.com</div>
              <div className="flex items-center gap-2"><Phone className="w-4 h-4" /> +91 9876543210</div>
              <div className="flex items-center gap-2"><Globe className="w-4 h-4" /> shinecraft.com</div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <footer className="bg-gray-950 border-t border-gray-800 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <img src="/logo.png" alt="Logo" className="w-40 h-auto rounded-xl object-contain" />
              </div>
              <p className="text-sm leading-relaxed">Enterprise-grade payslip generator and HR management system.</p>
            </div>
            <div>
              <h4 className="text-gray-100 font-semibold mb-3">Product</h4>
              <div className="space-y-2 text-sm">
                <p>Employee Management</p>
                <p>Payslip Generation</p>
                <p>Salary Upload</p>
                <p>Attendance Tracking</p>
              </div>
            </div>
            <div>
              <h4 className="text-gray-100 font-semibold mb-3">Company</h4>
              <div className="space-y-2 text-sm">
                <p>About Us</p>
                <p>Contact</p>
                <p>Privacy Policy</p>
                <p>Terms of Service</p>
              </div>
            </div>
            <div>
              <h4 className="text-gray-100 font-semibold mb-3">Contact</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Mumbai, India</div>
                <div className="flex items-center gap-2"><Mail className="w-4 h-4" /> hr@shinecraft.com</div>
                <div className="flex items-center gap-2"><Phone className="w-4 h-4" /> +91 9876543210</div>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p>&copy; 2026 ShineCraft. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
