import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../services/authService';
import { Eye, EyeOff, LayoutDashboard, ArrowRight, CheckCircle2 } from 'lucide-react';

function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await login(formData.email, formData.password);

      if (response.token) {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Left Section - Form */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-20 xl:px-24 bg-white">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="mb-10">
             <div className="flex items-center gap-2 text-primary-blue font-bold text-2xl mb-8">
               <div className="p-2 bg-blue-50 rounded-lg">
                 <LayoutDashboard className="w-6 h-6 text-primary-blue" />
               </div>
               <span>CloudInsight</span>
             </div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              Welcome back
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Please enter your details to sign in.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-md bg-red-50 border border-red-200">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Login error</h3>
                  <div className="mt-1 text-sm text-red-700">{error}</div>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="block w-full rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-primary-blue focus:outline-none focus:ring-1 focus:ring-primary-blue sm:text-sm transition-colors"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                Password
              </label>
              <div className="relative mt-1">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="block w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 shadow-sm focus:border-primary-blue focus:outline-none focus:ring-1 focus:ring-primary-blue sm:text-sm transition-colors"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Eye className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-primary-blue focus:ring-primary-blue"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-600">
                    Remember me
                  </label>
                </div>
                <div className="text-sm">
                  <a href="#" className="font-medium text-primary-blue hover:text-blue-700">
                    Forgot details?
                  </a>
                </div>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center rounded-lg bg-primary-blue px-3 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-blue transition-all disabled:opacity-70 disabled:cursor-not-allowed items-center gap-2"
              >
                {loading ? (
                    <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                    </>
                ) : (
                    <>
                    Sign In <ArrowRight className="w-4 h-4" />
                    </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-8 text-center text-sm text-slate-600">
              Don't have an account?{' '}
              <Link to="/register" className="font-semibold text-primary-blue hover:text-blue-700">
                Create free account
              </Link>
          </div>
        </div>
      </div>

      {/* Right Section - Visual/Testimonial */}
      <div className="hidden lg:flex flex-1 relative bg-primary-blue overflow-hidden">
        {/* Background Image with Dark Overlay */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80')] bg-cover bg-center" />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/95 to-slate-900/95" />
        
        {/* Decorative Circles */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500 rounded-full blur-3xl opacity-20" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-500 rounded-full blur-3xl opacity-20" />

        <div className="relative z-10 flex flex-col justify-center h-full px-16 text-white">
            <div className="mb-12">
               <h1 className="text-4xl font-bold leading-tight mb-6">
                  Intelligent, Unified <br/>
                  <span className="text-blue-300">Cloud Analytics</span>
               </h1>
               <p className="text-lg text-blue-100 max-w-md leading-relaxed">
                  Track your cloud spending, visualize trends, and catch cost anomalies before they become critical issues.
               </p>
            </div>

            <div className="space-y-6 bg-white/10 backdrop-blur-sm p-8 rounded-2xl border border-white/10 shadow-2xl max-w-lg">
                 <div className="flex gap-4 items-start">
                    <div className="p-2 bg-green-500/20 rounded-lg shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Consolidated View</h3>
                      <p className="text-sm text-blue-200 mt-1">See all your cloud costs in a single, easy-to-read dashboard.</p>
                    </div>
                 </div>
                 
                 <div className="flex gap-4 items-start">
                    <div className="p-2 bg-purple-500/20 rounded-lg shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Cost Anomalies</h3>
                      <p className="text-sm text-blue-200 mt-1">Identify unusual spending patterns immediately.</p>
                    </div>
                 </div>
            </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
