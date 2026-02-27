import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../services/authService';
import { Eye, EyeOff, LayoutDashboard, ArrowRight } from 'lucide-react';

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
    <div className="relative flex items-center justify-center min-h-screen bg-slate-50" style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>

      {/* Top-left branding */}
      <div className="absolute top-6 left-8 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#2563EB' }}>
          <LayoutDashboard className="w-[18px] h-[18px] text-white" />
        </div>
        <span className="text-[17px] font-semibold text-slate-900 tracking-tight">CloudInsight</span>
      </div>

      <div className="w-full max-w-[420px] bg-white rounded-xl shadow-lg px-8 py-10 mx-4">

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-[28px] font-semibold text-slate-900 leading-tight tracking-tight">
              Welcome back
            </h1>
            <p className="mt-2 text-[14px] text-slate-500 leading-relaxed" style={{ opacity: 0.7 }}>
              Sign in to your account to continue.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 px-4 py-3 rounded-lg border text-[13px]"
              style={{ backgroundColor: '#FEF2F2', borderColor: '#FECACA', color: '#991B1B' }}>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-[13px] font-medium text-slate-700 mb-1.5">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="name@company.com"
                className="block w-full h-[42px] px-3.5 text-[14px] text-slate-900 placeholder-slate-400 border border-slate-300 focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] outline-none transition-colors"
                style={{ borderRadius: '8px' }}
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-[13px] font-medium text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  className="block w-full h-[42px] px-3.5 pr-11 text-[14px] text-slate-900 placeholder-slate-400 border border-slate-300 focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] outline-none transition-colors"
                  style={{ borderRadius: '8px' }}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember + Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="w-[15px] h-[15px] rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB] focus:ring-offset-0"
                  style={{ borderRadius: '4px' }}
                />
                <span className="text-[13px] text-slate-600">Remember me</span>
              </label>
              <a href="#" className="text-[13px] font-medium hover:underline" style={{ color: '#2563EB' }}>
                Forgot password?
              </a>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 h-[42px] text-[14px] font-medium text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                backgroundColor: '#2563EB',
                borderRadius: '8px',
                boxShadow: '0 1px 3px 0 rgba(37, 99, 235, 0.25), 0 1px 2px -1px rgba(37, 99, 235, 0.2)',
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#1D4ED8'; }}
              onMouseLeave={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#2563EB'; }}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Register Link */}
          <p className="mt-8 text-center text-[13px] text-slate-500">
            Don't have an account?{' '}
            <Link to="/register" className="font-medium hover:underline" style={{ color: '#2563EB' }}>
              Create free account
            </Link>
          </p>

      </div>
    </div>
  );
}

export default Login;
