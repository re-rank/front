import { Link } from 'react-router-dom';
import { ArrowLeft, Building2, User } from 'lucide-react';

export function Register() {
  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="inline-flex items-center gap-2 mb-6 text-sm text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl shadow-lg">
          <div className="px-6 pt-8 pb-4 text-center space-y-4">
            <div className="mx-auto">
              <img src="/logo.png" alt="IV Logo" className="w-[60px] h-[60px] mx-auto invert" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-serif font-semibold text-white">Create Account</h1>
              <p className="text-sm text-neutral-400">Choose how you want to join</p>
            </div>
          </div>

          <div className="px-6 pb-8 space-y-4">
            <Link
              to="/register/company"
              className="flex items-center gap-4 p-5 rounded-xl border border-neutral-700 hover:border-white hover:bg-white/5 transition-colors group"
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-neutral-800 group-hover:bg-white/10 transition-colors">
                <Building2 className="w-6 h-6 text-neutral-300" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-white">Join as Company</p>
                <p className="text-sm text-neutral-400 mt-0.5">
                  Register your startup and showcase to investors
                </p>
              </div>
            </Link>

            <Link
              to="/register/member"
              className="flex items-center gap-4 p-5 rounded-xl border border-neutral-700 hover:border-white hover:bg-white/5 transition-colors group"
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-neutral-800 group-hover:bg-white/10 transition-colors">
                <User className="w-6 h-6 text-neutral-300" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-white">Join as Member</p>
                <p className="text-sm text-neutral-400 mt-0.5">
                  Discover and evaluate promising startups
                </p>
              </div>
            </Link>

            <p className="text-sm text-center text-neutral-400 pt-2">
              Already have an account?{' '}
              <Link to="/login" className="text-white hover:underline font-medium">
                Log In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
