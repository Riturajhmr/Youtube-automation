import Link from "next/link";
import {
  Sparkles,
  Video,
  Image,
  TrendingUp,
  Brain,
  ArrowRight,
  Upload,
  Wand2,
  Rocket,
  Check,
} from "lucide-react";

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-md bg-red-600 flex items-center justify-center flex-shrink-0">
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
          <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.19 8.19 0 004.77 1.52V6.75a4.83 4.83 0 01-1-.06z" />
        </svg>
      </div>
      <span className="font-bold text-white text-lg tracking-tight">TubeFlow</span>
    </div>
  );
}

const features = [
  {
    icon: Brain,
    title: "AI Metadata Generation",
    description:
      "Generate titles, descriptions, and tags that match how professional YouTube teams think — not generic templates.",
  },
  {
    icon: Video,
    title: "Video Understanding",
    description:
      "TubeFlow analyses your transcript and video content to understand topic, format, and audience intent before writing a single word.",
  },
  {
    icon: Image,
    title: "Thumbnail Context",
    description:
      "Upload your thumbnail and TubeFlow uses it as a visual signal to align metadata with what viewers actually see.",
  },
  {
    icon: TrendingUp,
    title: "SEO Optimisation",
    description:
      "Metadata is crafted to be discoverable — keywords woven in naturally, not stuffed. Viewer intent first, search engines second.",
  },
  {
    icon: Brain,
    title: "Niche-Aware Titles",
    description:
      "Whether you create tutorials, vlogs, gaming content, or music, TubeFlow adapts tone, style, and structure to your niche.",
  },
  {
    icon: Rocket,
    title: "YouTube Publishing",
    description:
      "Connect your channel and publish directly from TubeFlow — no copy-pasting. One-click publishing is on the way.",
    comingSoon: true,
  },
];

const steps = [
  {
    number: "01",
    icon: Upload,
    title: "Upload Your Video",
    description:
      "Drop in your video file and optionally add a thumbnail, title idea, or keywords to guide the AI.",
  },
  {
    number: "02",
    icon: Wand2,
    title: "AI Analyses & Generates",
    description:
      "TubeFlow processes your content and generates a full metadata package — title, description, and tags — in under a minute.",
  },
  {
    number: "03",
    icon: Rocket,
    title: "Review & Publish",
    description:
      "Review the metadata, make any edits you want, then publish or schedule directly to YouTube.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* ── Navbar ── */}
      <nav className="border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-3">
            <Link
              href="/sign-in"
              className="text-sm text-zinc-400 hover:text-white transition-colors px-3 py-1.5 rounded-md hover:bg-zinc-800"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="text-sm font-medium bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-md transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="max-w-6xl mx-auto px-4 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-full px-4 py-1.5 text-xs text-zinc-400 mb-8">
          <Sparkles className="w-3.5 h-3.5 text-red-500" />
          AI-powered metadata for serious creators
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white mb-6 leading-tight">
          Generate Professional{" "}
          <span className="text-red-500">YouTube Metadata</span>
          <br />
          with AI
        </h1>

        <p className="text-lg text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Upload your video and get titles, descriptions, and tags that look like they were
          written by an experienced YouTube content team — in under a minute.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors text-sm"
          >
            Get Started Free
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-2 border border-zinc-700 hover:border-zinc-600 text-zinc-300 hover:text-white font-medium px-6 py-3 rounded-lg transition-colors text-sm"
          >
            See How It Works
          </a>
        </div>

        <div className="mt-14 flex items-center justify-center gap-8 text-xs text-zinc-500">
          {["No credit card required", "Works for any niche", "Generates in under 60s"].map(
            (item) => (
              <span key={item} className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                {item}
              </span>
            )
          )}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">
            Everything you need to grow your channel
          </h2>
          <p className="text-zinc-400 max-w-xl mx-auto">
            TubeFlow handles metadata strategy so you can focus on making great videos.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map(({ icon: Icon, title, description, comingSoon }) => (
            <div
              key={title}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-colors relative"
            >
              {comingSoon && (
                <span className="absolute top-4 right-4 text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full border border-zinc-700">
                  Coming Soon
                </span>
              )}
              <div className="w-10 h-10 rounded-lg bg-red-600/10 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="font-semibold text-white mb-2 text-sm">{title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="bg-zinc-900/40 border-y border-zinc-800/60 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">How It Works</h2>
            <p className="text-zinc-400 max-w-xl mx-auto">
              From upload to publish-ready metadata in three steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map(({ number, icon: Icon, title, description }) => (
              <div key={number} className="text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-zinc-800 border border-zinc-700 mb-5 relative">
                  <Icon className="w-6 h-6 text-white" />
                  <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center leading-none">
                    {number.slice(1)}
                  </span>
                </div>
                <h3 className="font-semibold text-white mb-2">{title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="max-w-6xl mx-auto px-4 py-24 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
          Ready to grow your channel?
        </h2>
        <p className="text-zinc-400 mb-8 max-w-lg mx-auto">
          Join creators who use TubeFlow to publish with professional-grade metadata every time.
        </p>
        <Link
          href="/sign-up"
          className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-8 py-3.5 rounded-lg transition-colors"
        >
          Get Started Free
          <ArrowRight className="w-4 h-4" />
        </Link>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-zinc-800/60 py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo />
          <p className="text-xs text-zinc-600">
            &copy; {new Date().getFullYear()} TubeFlow. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
