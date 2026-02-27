import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../services/authService';
import { Eye, EyeOff, LayoutDashboard, Check, ArrowRight } from 'lucide-react';

function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
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

  const validateForm = () => {
    if (!formData.name.trim()) return 'Name is required';
    if (formData.name.length < 2) return 'Name must be at least 2 characters';
    if (!formData.email.includes('@')) return 'Please enter a valid email';
    if (formData.password.length < 8) return 'Password must be at least 8 characters';
    if (formData.password !== formData.confirmPassword) return 'Passwords do not match';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    const validationError = validateForm();
    if (validationError) {
        setError(validationError);
        return;
    }

    setLoading(true);

    try {
      const response = await register(
        formData.name,
        formData.email,
        formData.password,
        formData.confirmPassword
      );

      if (response.token) {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        navigate('/dashboard');
      }
    } catch (err) {
       setError(err.response?.data?.error || 'Registration failed. Please try again.');
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

      <div className="w-full max-w-[480px] bg-white rounded-xl shadow-lg px-8 py-10 mx-4">
          <div className="mb-10">
            <h2 className="text-3xl font-bold text-slate-900">
              Create your account
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Get started with your free 30-day trial. No credit card required.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-md bg-red-50 border border-red-200">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700">
                Full Name
              </label>
              <div className="mt-1">
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="block w-full rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-primary-blue focus:outline-none focus:ring-1 focus:ring-primary-blue sm:text-sm transition-colors"
                  placeholder="John Doe"
                />
              </div>
            </div>

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
                  placeholder="you@company.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                    Password
                </label>
                <div className="relative mt-1">
                    <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="block w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 shadow-sm focus:border-primary-blue focus:outline-none focus:ring-1 focus:ring-primary-blue sm:text-sm transition-colors"
                    placeholder="Min 8 chars"
                    />
                     <button
                        type="button"
                        className="absolute inset-y-0 right-0 flex items-center pr-2 text-slate-400 hover:text-slate-600"
                        onClick={() => setShowPassword(!showPassword)}
                        >
                        {showPassword ? (
                            <EyeOff className="h-4 w-4" aria-hidden="true" />
                        ) : (
                            <Eye className="h-4 w-4" aria-hidden="true" />
                        )}
                    </button>
                </div>
                </div>

                <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700">
                    Confirm Password
                </label>
                <div className="relative mt-1">
                    <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="block w-full rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-primary-blue focus:outline-none focus:ring-1 focus:ring-primary-blue sm:text-sm transition-colors"
                    placeholder="Repeat password"
                    />
                </div>
                </div>
            </div>

            <div className="flex items-start">
                  <div className="flex h-5 items-center">
                    <input
                      id="terms"
                      name="terms"
                      type="checkbox"
                      required
                      className="h-4 w-4 rounded border-slate-300 text-primary-blue focus:ring-primary-blue"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="terms" className="font-medium text-slate-700">
                      I agree to the <a href="#" className="text-primary-blue hover:text-blue-700">Terms</a> and <a href="#" className="text-primary-blue hover:text-blue-700">Privacy Policy</a>
                    </label>
                  </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center rounded-lg bg-primary-blue px-3 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-blue transition-colors disabled:opacity-70 disabled:cursor-not-allowed items-center gap-2"
              >
                {loading ? 'Creating account...' : (
                    <>
                    Get Started <ArrowRight className="w-4 h-4" />
                    </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-8 text-center text-sm text-slate-600">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-primary-blue hover:text-blue-700">
                Sign in
              </Link>
          </div>
      </div>
    </div>
  );
}

export default Register;
