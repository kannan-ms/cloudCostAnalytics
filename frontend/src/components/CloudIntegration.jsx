import React, { useState } from 'react';
import {
  Cloud,
  Upload,
  Key,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  X,
  Loader2,
  Shield,
  ArrowRight,
  BarChart3,
  ChevronDown,
} from 'lucide-react';
import api from '../services/api';

// ─── Provider meta ───────────────────────────────────────────────────────────
const PROVIDERS = [
  {
    id: 'azure',
    name: 'Microsoft Azure',
    color: 'from-blue-500 to-cyan-500',
    ring: 'ring-blue-500/30',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    icon: '☁️',
    credentialFields: [
      { key: 'tenant_id', label: 'Tenant ID', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
      { key: 'client_id', label: 'Client ID', placeholder: 'Application (client) ID' },
      { key: 'client_secret', label: 'Client Secret', placeholder: '••••••••••••', type: 'password' },
      { key: 'subscription_id', label: 'Subscription ID', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
    ],
  },
  {
    id: 'aws',
    name: 'Amazon Web Services',
    color: 'from-orange-400 to-yellow-500',
    ring: 'ring-orange-500/30',
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
    icon: '🔶',
    credentialFields: [
      { key: 'aws_access_key_id', label: 'Access Key ID', placeholder: 'AKIAIOSFODNN7EXAMPLE' },
      { key: 'aws_secret_access_key', label: 'Secret Access Key', placeholder: '••••••••••••', type: 'password' },
      { key: 'region_name', label: 'Region (optional)', placeholder: 'us-east-1' },
    ],
  },
  {
    id: 'gcp',
    name: 'Google Cloud Platform',
    color: 'from-red-500 to-blue-500',
    ring: 'ring-red-500/30',
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    icon: '🔴',
    credentialFields: [
      { key: 'service_account_json', label: 'Service Account JSON Path', placeholder: '/path/to/key.json' },
      { key: 'project_id', label: 'Project ID', placeholder: 'my-gcp-project' },
      { key: 'dataset_id', label: 'BigQuery Dataset ID', placeholder: 'billing_export' },
      { key: 'table_id', label: 'BigQuery Table ID', placeholder: 'gcp_billing_export_v1' },
    ],
  },
];

// ─── Component ───────────────────────────────────────────────────────────────
const CloudIntegration = () => {
  // Tabs: 'file' | 'api'
  const [tab, setTab] = useState('file');
  const [provider, setProvider] = useState('');
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [credentials, setCredentials] = useState({});
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [runAnomalyDetection, setRunAnomalyDetection] = useState(true);

  const selectedProvider = PROVIDERS.find((p) => p.id === provider);

  // ── file handlers ──────────────────────────────────────────────────────────
  const onDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) pickFile(e.dataTransfer.files[0]);
  };

  const pickFile = (f) => {
    const ext = f.name.toLowerCase().split('.').pop();
    if (ext !== 'csv') {
      setError('Only CSV files are supported for multi-cloud ingestion.');
      setFile(null);
      return;
    }
    setFile(f);
    setError(null);
    setResult(null);
  };

  // ── submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setError(null);
    setResult(null);

    if (!provider) {
      setError('Please select a cloud provider.');
      return;
    }

    if (tab === 'file' && !file) {
      setError('Please select a CSV billing file.');
      return;
    }

    if (tab === 'api') {
      const fields = selectedProvider?.credentialFields || [];
      const missing = fields
        .filter((f) => !f.key.includes('optional') && !f.label.includes('optional'))
        .filter((f) => !credentials[f.key]?.trim());
      if (missing.length) {
        setError(`Missing required credentials: ${missing.map((f) => f.label).join(', ')}`);
        return;
      }
    }

    setLoading(true);
    try {
      let res;
      if (tab === 'file') {
        if (runAnomalyDetection) {
          res = await api.ingestAndDetect(provider, file);
        } else {
          res = await api.ingestFromFile(provider, file);
        }
      } else {
        res = await api.ingestFromApi(provider, credentials, startDate || undefined, endDate || undefined);
      }
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Ingestion failed. Please check your inputs and try again.');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setError(null);
    setCredentials({});
    setStartDate('');
    setEndDate('');
  };

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg text-white">
            <Cloud size={22} />
          </div>
          Cloud Integration
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Connect your cloud billing data from Azure, AWS, or GCP — via file upload or direct API.
        </p>
      </div>

      {/* ── Provider selector ───────────────────────────────────────────────── */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">1 — Select Cloud Provider</h2>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setProvider(p.id);
                setResult(null);
                setError(null);
              }}
              className={`relative flex items-center gap-4 p-5 rounded-xl border-2 transition-all duration-200 text-left group ${
                provider === p.id
                  ? `${p.border} ${p.bg} ring-2 ${p.ring} shadow-md`
                  : 'border-slate-200 hover:border-slate-300 hover:shadow-sm bg-white'
              }`}
            >
              <span className="text-3xl">{p.icon}</span>
              <div>
                <span className={`text-sm font-semibold ${provider === p.id ? p.text : 'text-slate-800'}`}>
                  {p.name}
                </span>
                <span className="block text-xs text-slate-400 mt-0.5 capitalize">{p.id.toUpperCase()}</span>
              </div>
              {provider === p.id && (
                <CheckCircle size={18} className={`absolute top-3 right-3 ${p.text}`} />
              )}
            </button>
          ))}
        </div>
      </section>

      {/* ── Source type tabs ─────────────────────────────────────────────────── */}
      {provider && (
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">2 — Choose Data Source</h2>
          </div>

          {/* Tab switches */}
          <div className="flex border-b border-slate-100">
            <button
              onClick={() => { setTab('file'); setResult(null); setError(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-colors ${
                tab === 'file'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/40'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Upload size={16} />
              File Upload (CSV)
            </button>
            <button
              onClick={() => { setTab('api'); setResult(null); setError(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-colors ${
                tab === 'api'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/40'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Key size={16} />
              API Credentials
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* ---------- FILE TAB ---------- */}
            {tab === 'file' && (
              <>
                <div
                  className={`border-2 border-dashed rounded-xl p-10 text-center transition-all ${
                    dragActive
                      ? 'border-blue-500 bg-blue-50'
                      : file
                      ? 'border-blue-400 bg-blue-50/30'
                      : 'border-slate-300 bg-slate-50 hover:border-slate-400'
                  }`}
                  onDragEnter={onDrag}
                  onDragLeave={onDrag}
                  onDragOver={onDrag}
                  onDrop={onDrop}
                >
                  {!file ? (
                    <div className="flex flex-col items-center">
                      <div className="mb-4 p-4 bg-white rounded-full shadow-sm ring-1 ring-slate-200">
                        <FileSpreadsheet className="text-slate-400" size={28} />
                      </div>
                      <p className="text-slate-900 font-semibold mb-1">
                        Drag & drop your billing CSV
                      </p>
                      <p className="text-slate-400 text-sm mb-5">
                        {selectedProvider?.name} cost export file (.csv)
                      </p>
                      <label
                        htmlFor="csp-file-input"
                        className="inline-flex items-center gap-2 px-5 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium cursor-pointer hover:bg-slate-800 transition-colors"
                      >
                        Browse Files
                      </label>
                      <input
                        id="csp-file-input"
                        type="file"
                        accept=".csv"
                        onChange={(e) => e.target.files?.[0] && pickFile(e.target.files[0])}
                        className="hidden"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                          <FileSpreadsheet size={22} />
                        </div>
                        <div className="text-left">
                          <p className="text-slate-900 font-semibold text-sm truncate max-w-[250px]">{file.name}</p>
                          <p className="text-slate-500 text-xs">{(file.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                      <button
                        onClick={() => { setFile(null); setResult(null); }}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Anomaly detection toggle */}
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <div
                    onClick={() => setRunAnomalyDetection(!runAnomalyDetection)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      runAnomalyDetection ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        runAnomalyDetection ? 'translate-x-5' : ''
                      }`}
                    />
                  </div>
                  <span className="text-sm text-slate-700 font-medium">Run anomaly detection after ingestion</span>
                </label>
              </>
            )}

            {/* ---------- API TAB ---------- */}
            {tab === 'api' && selectedProvider && (
              <>
                <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                  <Shield size={18} className="mt-0.5 flex-shrink-0" />
                  <span>
                    Credentials are sent over HTTPS and are <strong>not stored</strong> on the server.
                    They are used only for this one-time data fetch.
                  </span>
                </div>

                <div className="grid gap-4">
                  {selectedProvider.credentialFields.map((field) => (
                    <div key={field.key}>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">{field.label}</label>
                      <input
                        type={field.type || 'text'}
                        placeholder={field.placeholder}
                        value={credentials[field.key] || ''}
                        onChange={(e) => setCredentials({ ...credentials, [field.key]: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors"
                      />
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Start Date (optional)</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">End Date (optional)</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {/* ── Error ─────────────────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* ── Submit button ─────────────────────────────────────────────────────── */}
      {provider && !result && (
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 text-white rounded-lg font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors shadow-sm"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Processing…
            </>
          ) : (
            <>
              <ArrowRight size={18} />
              {tab === 'file'
                ? runAnomalyDetection
                  ? 'Upload & Run Anomaly Detection'
                  : 'Upload & Ingest'
                : 'Fetch from API'}
            </>
          )}
        </button>
      )}

      {/* ── Results ───────────────────────────────────────────────────────────── */}
      {result && (
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
            <CheckCircle size={20} className="text-green-600" />
            <h2 className="text-sm font-bold text-green-700 uppercase tracking-wider">Ingestion Complete</h2>
          </div>

          <div className="p-6 space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <SummaryCard
                label="Rows Ingested"
                value={result.summary?.rows ?? result.ingestion?.rows ?? 0}
                accent="blue"
              />
              <SummaryCard
                label="Total Cost"
                value={`$${(result.summary?.total_cost ?? result.ingestion?.total_cost ?? 0).toLocaleString()}`}
                accent="green"
              />
              <SummaryCard
                label="Categories"
                value={(result.summary?.categories ?? result.ingestion?.categories ?? []).length}
                accent="purple"
              />
              {result.anomalies && (
                <SummaryCard
                  label="Anomalies Found"
                  value={result.anomalies.total_detected}
                  accent={result.anomalies.total_detected > 0 ? 'red' : 'green'}
                />
              )}
            </div>

            {/* Category chips */}
            {(result.summary?.categories ?? result.ingestion?.categories ?? []).length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Detected Categories</h3>
                <div className="flex flex-wrap gap-2">
                  {(result.summary?.categories ?? result.ingestion?.categories ?? []).map((cat) => (
                    <span
                      key={cat}
                      className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Date range */}
            {result.summary?.date_range && (
              <div className="text-sm text-slate-600">
                <span className="font-medium">Date range:</span>{' '}
                {result.summary.date_range.from} → {result.summary.date_range.to}
              </div>
            )}

            {/* Anomalies list */}
            {result.anomalies?.items?.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Anomalies Detected</h3>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {result.anomalies.items.map((a, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-3 p-4 rounded-xl border text-sm ${
                        a.severity === 'high'
                          ? 'bg-red-50 border-red-200 text-red-800'
                          : 'bg-amber-50 border-amber-200 text-amber-800'
                      }`}
                    >
                      <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{a.message}</p>
                        <p className="text-xs mt-1 opacity-75">
                          Cost: ${a.detected_value?.toFixed(2)} • Expected: ${a.expected_value?.toFixed(2)} •{' '}
                          Deviation: {a.deviation_percentage}%
                        </p>
                      </div>
                      <span
                        className={`flex-shrink-0 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          a.severity === 'high' ? 'bg-red-200 text-red-900' : 'bg-amber-200 text-amber-900'
                        }`}
                      >
                        {a.severity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.anomalies && result.anomalies.total_detected === 0 && (
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
                <CheckCircle size={18} />
                <span className="font-medium">No anomalies detected — your spending looks normal.</span>
              </div>
            )}

            <button
              onClick={reset}
              className="w-full px-5 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold text-sm hover:bg-slate-200 transition-colors"
            >
              Run Another Ingestion
            </button>
          </div>
        </section>
      )}

      {/* ── Column expectations ───────────────────────────────────────────────── */}
      {provider && tab === 'file' && !result && (
        <section className="bg-slate-50 rounded-lg border border-slate-200 p-5">
          <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
            <BarChart3 size={16} className="text-blue-500" />
            Expected CSV Columns for {selectedProvider?.name}
          </h3>
          <ColumnHints provider={provider} />
        </section>
      )}
    </div>
  );
};

// ─── Sub-components ──────────────────────────────────────────────────────────
const SummaryCard = ({ label, value, accent = 'blue' }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    green: 'bg-green-50 text-green-700 border-green-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
    red: 'bg-red-50 text-red-700 border-red-100',
  };
  return (
    <div className={`p-4 rounded-xl border ${colors[accent]}`}>
      <span className="block text-xs uppercase font-bold tracking-wider opacity-70 mb-1">{label}</span>
      <span className="block text-xl font-bold">{value}</span>
    </div>
  );
};

const COLUMN_HINTS = {
  azure: [
    { col: 'Date / UsageStartDate', desc: 'Usage start date' },
    { col: 'MeterCategory / ServiceName', desc: 'Azure service name' },
    { col: 'CostInBillingCurrency / Cost', desc: 'Cost amount' },
  ],
  aws: [
    { col: 'lineItem/UsageStartDate', desc: 'Billing period start date' },
    { col: 'product/ProductName / lineItem/ProductCode', desc: 'AWS service' },
    { col: 'lineItem/UnblendedCost / BlendedCost', desc: 'Cost amount' },
  ],
  gcp: [
    { col: 'usage_start_time', desc: 'Usage start timestamp' },
    { col: 'service.description', desc: 'GCP service name' },
    { col: 'cost', desc: 'Total cost' },
  ],
};

const ColumnHints = ({ provider }) => {
  const hints = COLUMN_HINTS[provider] || [];
  return (
    <div className="space-y-2">
      {hints.map((h, i) => (
        <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
          <span>
            <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-800 font-mono text-[11px]">
              {h.col}
            </code>{' '}
            — {h.desc}
          </span>
        </div>
      ))}
    </div>
  );
};

export default CloudIntegration;
