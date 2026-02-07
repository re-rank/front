import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import {
  Zap, BarChart3, MessageSquare, Play, Video,
  User, BookOpen, Linkedin, ExternalLink,
  Newspaper, MessageCircle, ArrowRight, Instagram,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart as RechartsBarChart, Bar,
  XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip,
} from 'recharts';

// --- Mock data for demo sections ---
const teamMembers = [
  {
    name: 'Sarah Chen',
    role: 'CEO',
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face',
    school: 'Stanford University',
    major: 'Computer Science',
    bio: 'Former Product Lead at Google, 8 years in AI/ML',
  },
  {
    name: 'Michael Park',
    role: 'CTO',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face',
    school: 'MIT',
    major: 'Electrical Engineering',
    bio: 'Ex-Amazon Principal Engineer, distributed systems expert',
  },
  {
    name: 'Emily Johnson',
    role: 'CFO',
    photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face',
    school: 'Wharton School',
    major: 'Finance & Economics',
    bio: 'Former VP at Goldman Sachs, 12 years in fintech',
  },
];

const newsItems = [
  {
    title: 'TechFlow AI Raises $25M Series A to Revolutionize Workflow Automation',
    source: 'TechCrunch',
    date: 'Jan 15, 2024',
    image: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&h=250&fit=crop',
  },
  {
    title: 'How GreenBattery is Making EVs More Sustainable with Solid-State Tech',
    source: 'Forbes',
    date: 'Jan 10, 2024',
    image: 'https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?w=400&h=250&fit=crop',
  },
  {
    title: 'HealthAI Partners with Mayo Clinic for Remote Diagnostics Trial',
    source: 'Reuters',
    date: 'Jan 5, 2024',
    image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&h=250&fit=crop',
  },
];

const keyQuestions = [
  'How did your team meet, and how will you overcome difficult situations?',
  'What is your unique moat - patents, data, or network effects?',
  'What is the biggest gap in your capabilities for running this business?',
  'If a large company offered $10M to acquire you tomorrow, would you sell?',
  'What made you decide to start a company?',
];

const chartMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function generateData(offset: number) {
  return chartMonths.map((month, i) => ({
    month,
    revenue: Math.floor(20 + Math.random() * 80 + i * 5 + offset),
    users: Math.floor(300 + Math.random() * 500 + i * 100 + offset * 3),
    sessions: Math.floor(2500 + Math.random() * 2000 + i * 200 + offset * 5),
  }));
}

function AnimatedChart() {
  const [data, setData] = useState(() => generateData(0));

  useEffect(() => {
    const interval = setInterval(() => {
      setData(generateData(Math.random() * 20));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const chartStyle = {
    fontSize: 10,
    fill: '#737373',
  };

  return (
    <>
      {/* Charts - 2 col + 1 full width */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="bg-neutral-800/40 border border-neutral-700/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Revenue (Stripe)</h3>
            <span className="text-xs text-neutral-500">Last 12 months</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
              <XAxis dataKey="month" tick={chartStyle} axisLine={false} tickLine={false} />
              <YAxis tick={chartStyle} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => `$${v}K`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#171717', border: '1px solid #404040', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#a3a3a3' }}
                itemStyle={{ color: '#10b981' }}
              />
              <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="url(#gradRevenue)" strokeWidth={2} animationDuration={1500} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-neutral-800/40 border border-neutral-700/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Active Users (GA4)</h3>
            <span className="text-xs text-neutral-500">Last 12 months</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="gradUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
              <XAxis dataKey="month" tick={chartStyle} axisLine={false} tickLine={false} />
              <YAxis tick={chartStyle} axisLine={false} tickLine={false} width={40} />
              <Tooltip
                contentStyle={{ backgroundColor: '#171717', border: '1px solid #404040', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#a3a3a3' }}
                itemStyle={{ color: '#3b82f6' }}
              />
              <Area type="monotone" dataKey="users" stroke="#3b82f6" fill="url(#gradUsers)" strokeWidth={2} animationDuration={1500} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="bg-neutral-800/40 border border-neutral-700/50 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Sessions Overview</h3>
          <span className="text-xs text-neutral-500">Last 12 months</span>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <RechartsBarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
            <XAxis dataKey="month" tick={chartStyle} axisLine={false} tickLine={false} />
            <YAxis tick={chartStyle} axisLine={false} tickLine={false} width={40} />
            <Tooltip
              contentStyle={{ backgroundColor: '#171717', border: '1px solid #404040', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: '#a3a3a3' }}
              itemStyle={{ color: '#f87171' }}
            />
            <Bar dataKey="sessions" fill="#f87171" radius={[4, 4, 0, 0]} animationDuration={1500} />
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

export function Home() {
  const { user, getRole } = useAuthStore();
  const role = getRole();

  return (
    <div className="bg-neutral-950 text-white">
      {/* Hero Section */}
      <section id="hero" className="relative py-24 sm:py-32">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-neutral-800/60 border border-neutral-700 rounded-full px-4 py-1.5 mb-8">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-sm text-neutral-300">Full transparency into our projects</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-serif leading-tight text-balance">
            Access all project insights<br />
            <span className="text-muted-foreground">in one view.</span>
          </h1>

          <p className="text-lg text-neutral-400 max-w-2xl mx-auto mb-10">
            Full transparency into our projects, accessible to everyone, anywhere.
            Discover startups with real-time metrics and standardized analysis.
          </p>

          {user ? (
            <div className="flex gap-4 justify-center">
              {role === 'investor' && (
                <Link to="/companies">
                  <Button size="lg">Explore Startups</Button>
                </Link>
              )}
              {role === 'startup' && (
                <Link to="/company/register">
                  <Button size="lg">Register</Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="flex gap-4 justify-center flex-wrap">
              <Link to="/register/company">
                <button className="inline-flex items-center gap-2 bg-white text-black font-medium px-6 py-3 rounded-lg hover:bg-neutral-200 transition-colors">
                  Join as Company <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
              <Link to="/register/member">
                <button className="inline-flex items-center gap-2 bg-transparent text-white font-medium px-6 py-3 rounded-lg border border-neutral-600 hover:bg-neutral-800 transition-colors">
                  Join as Member
                </button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 border-t border-neutral-800">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Zap,
                title: 'Real-time Data Sync',
                desc: 'Seamlessly integrated with Stripe and GA4, reflecting every business heartbeat in live graphs.',
              },
              {
                icon: BarChart3,
                title: 'Live Analytics',
                desc: 'Track MRR, user growth, and key metrics with beautiful, animated visualizations.',
              },
              {
                icon: MessageSquare,
                title: 'Standardized Q&A',
                desc: 'All startups answer 6 key questions investors care about most.',
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
                <div className="w-10 h-10 bg-neutral-800 rounded-lg flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-neutral-300" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{title}</h3>
                <p className="text-sm text-neutral-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Videos Section */}
      <section id="videos" className="py-20 border-t border-neutral-800">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="w-10 h-10 bg-neutral-800 rounded-lg flex items-center justify-center mb-4">
                <Video className="w-5 h-5 text-neutral-300" />
              </div>
              <h2 className="text-3xl md:text-4xl font-serif leading-tight text-balance">
                5-Minute Company<br />
                <span className="text-muted-foreground">Introduction Videos</span>
              </h2>
              <p className="text-neutral-400">
                Every company shares a 5-minute introduction video. Get to know the founders,
                understand the product, and feel the company culture before diving into the data.
              </p>
            </div>
            <div className="space-y-4">
              <div className="relative aspect-video bg-neutral-800 rounded-xl overflow-hidden group cursor-pointer flex items-center justify-center">
                <div className="flex items-center justify-center">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
                    <Play className="w-6 h-6 text-white fill-white" />
                  </div>
                </div>
                <p className="absolute bottom-3 left-3 text-sm text-white/80">TechFlow AI - Company Introduction</p>
              </div>
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
                <h3 className="font-semibold mb-1">Watch founder stories & product demos</h3>
                <p className="text-sm text-neutral-400">
                  Every company uploads a 5-min video explaining their vision, product, and team.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section id="team" className="py-20 border-t border-neutral-800">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="w-10 h-10 bg-neutral-800 rounded-lg flex items-center justify-center mx-auto mb-4">
              <User className="w-5 h-5 text-neutral-300" />
            </div>
            <h2 className="text-3xl md:text-4xl font-serif leading-tight text-balance">Meet the Leadership Team</h2>
            <p className="text-neutral-400 max-w-2xl mx-auto">
              Access detailed C-level profiles including education background, career history, and direct links to their professional networks.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {teamMembers.map((member) => (
              <div key={member.name} className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div>
                    <span className="text-xs text-neutral-500 uppercase tracking-wider">{member.role}</span>
                    <h3 className="font-semibold">{member.name}</h3>
                  </div>
                </div>
                <div className="space-y-1.5 mb-3">
                  <p className="text-sm text-neutral-400 flex items-center gap-2">
                    <User className="w-3.5 h-3.5" /> {member.school}
                  </p>
                  <p className="text-sm text-neutral-400 flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5" /> {member.major}
                  </p>
                </div>
                <p className="text-sm text-neutral-500 mb-4">{member.bio}</p>
                <div className="flex gap-3">
                  <Linkedin className="w-4 h-4 text-neutral-500 hover:text-white cursor-pointer transition-colors" />
                  <User className="w-4 h-4 text-neutral-500 hover:text-white cursor-pointer transition-colors" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* News Section */}
      <section id="news" className="py-20 border-t border-neutral-800">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12">
            {/* News cards */}
            <div className="space-y-4">
              {newsItems.map((item) => (
                <div
                  key={item.title}
                  className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex gap-4 items-start hover:border-neutral-700 transition-colors cursor-pointer group"
                >
                  <img
                    src={item.image}
                    alt=""
                    className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-sm mb-2 line-clamp-2 group-hover:text-white transition-colors">{item.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                      <span>{item.source}</span>
                      <span>•</span>
                      <span>{item.date}</span>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-neutral-600 flex-shrink-0 mt-1" />
                </div>
              ))}
            </div>

            {/* News description */}
            <div className="flex flex-col justify-center">
              <div className="w-10 h-10 bg-neutral-800 rounded-lg flex items-center justify-center mb-4">
                <Newspaper className="w-5 h-5 text-neutral-300" />
              </div>
              <h2 className="text-3xl md:text-4xl font-serif leading-tight text-balance">
                Stay Updated with<br />
                <span className="text-muted-foreground">Company News</span>
              </h2>
              <p className="text-neutral-400">
                Companies share their latest press coverage, funding announcements, and milestones.
                Track the journey of startups you're interested in.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Analytics Section */}
      <section id="analytics" className="py-20 border-t border-neutral-800">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-6">
            <h2 className="text-3xl md:text-4xl font-serif leading-tight text-balance">Real-time Data Sync</h2>
            <p className="text-neutral-400 max-w-2xl mx-auto">
              Seamlessly integrated with Stripe and GA4, reflecting every business heartbeat in live graphs.
            </p>
          </div>

          {/* Outer card wrapping metrics + charts */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
            {/* Metric summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Monthly Revenue', value: '$70.8K', change: '+23%' },
                { label: 'Active Users', value: '1,914', change: '+18%' },
                { label: 'Sessions', value: '4,932', change: '+31%' },
                { label: 'Conversion', value: '4.2%', change: '+0.8%' },
              ].map(({ label, value, change }) => (
                <div key={label} className="bg-neutral-800/50 border border-neutral-700/50 rounded-xl p-4">
                  <p className="text-xs text-neutral-500 mb-1">{label}</p>
                  <div className="flex items-baseline justify-between">
                    <p className="text-xl font-bold">{value}</p>
                    <span className="text-xs text-green-500">{change}</span>
                  </div>
                </div>
              ))}
            </div>

            <AnimatedChart />
          </div>
        </div>
      </section>

      {/* Questions Section */}
      <section id="questions" className="py-20 border-t border-neutral-800">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="text-3xl md:text-4xl font-serif leading-tight text-balance">
                Analyze Investment Value<br />
                <span className="text-muted-foreground">with Key Questions</span>
              </h2>
              <p className="text-neutral-400 mb-6">
                Each startup selects and answers 5 out of 10 curated questions that investors care about most.
                Standardized Q&A enables fast and accurate comparative analysis across companies.
              </p>
              <div className="flex items-center gap-2 text-sm text-neutral-400 mb-6">
                <MessageCircle className="w-4 h-4 text-neutral-400" />
                <span>10 questions available, 5 selected per company</span>
              </div>
              <Link to="/register/member">
                <button className="inline-flex items-center gap-2 bg-white text-black font-medium px-5 py-2.5 rounded-lg hover:bg-neutral-200 transition-colors text-sm">
                  Start Exploring <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            </div>

            <div className="space-y-3">
              {keyQuestions.map((q, i) => (
                <div
                  key={i}
                  className="bg-neutral-900 border border-neutral-800 rounded-xl px-5 py-4 flex items-start gap-4"
                >
                  <span className="flex-shrink-0 w-7 h-7 bg-neutral-800 rounded-full flex items-center justify-center text-xs font-bold text-neutral-300">
                    {i + 1}
                  </span>
                  <p className="text-sm text-neutral-300">{q}</p>
                </div>
              ))}
              <p className="text-sm text-neutral-500 pl-11">
                + 5 more questions available for companies to choose from
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 border-t border-neutral-800">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-serif leading-tight text-balance">Ready to get started?</h2>
          <p className="text-neutral-400 mb-8">
            Join IV today and discover the future of startup transparency.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link to="/register/company">
              <button className="inline-flex items-center gap-2 bg-white text-black font-medium px-6 py-3 rounded-lg hover:bg-neutral-200 transition-colors">
                Join as Company <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
            <Link to="/register/member">
              <button className="inline-flex items-center gap-2 bg-transparent text-white font-medium px-6 py-3 rounded-lg border border-neutral-600 hover:bg-neutral-800 transition-colors">
                Join as Member
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-800 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img src="/logo.png" alt="IV" className="h-8 w-auto" />
              <p className="text-xs text-neutral-500">
                IV is not an investment platform and does not provide investment advice.
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-neutral-500">
              <a href="/terms" className="hover:text-white transition-colors">Terms</a>
              <a href="/privacy" className="hover:text-white transition-colors">Privacy</a>
              <a href="/policies" className="hover:text-white transition-colors">Policies</a>
              <a href="mailto:contact@ivholdings.com" className="hover:text-white transition-colors">Contact</a>
              <a href="https://instagram.com/IVinsights" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="https://www.linkedin.com/company/ivholdings/about/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                <Linkedin className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
