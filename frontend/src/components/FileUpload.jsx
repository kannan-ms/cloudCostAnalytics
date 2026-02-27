import { useState } from 'react';
import { Upload, Download, FileSpreadsheet, X, CheckCircle, AlertTriangle, Lightbulb, File } from 'lucide-react';
import api from '../services/api';

const FileUpload = ({ onUploadSuccess, onSwitchToOverview }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (selectedFile) => {
    const validExtensions = ['.csv', '.xls', '.xlsx'];
    const fileExtension = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf('.'));

    if (!validExtensions.includes(fileExtension)) {
      setError('Please upload a CSV or Excel file (.csv, .xlsx, .xls)');
      setFile(null);
      return;
    }

    setFile(selectedFile);
    setError(null);
    setUploadResult(null);
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setUploading(true);
    setError(null);
    setUploadResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Axios automatically sets the Content-Type to multipart/form-data with the correct boundary
      // when a FormData object is passed as the body.
      const response = await api.post('/costs/upload', formData);

      setUploadResult(response.data);

      if (onUploadSuccess) {
        setTimeout(() => {
          onUploadSuccess();
        }, 500);
      }
    } catch (err) {
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.code === 'ERR_NETWORK' || !err.response) {
        setError('Could not reach the server. Please make sure the backend is running and try again.');
      } else {
        setError(`Upload failed (${err.response?.status || 'unknown'}). Please try again.`);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleClear = () => {
    setFile(null);
    setError(null);
    setUploadResult(null);
  };

  const downloadTemplate = () => {
    window.open('http://localhost:5000/api/costs/upload/template', '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <FileSpreadsheet className="text-blue-600" size={20} />
          Upload Cost Data
        </h3>
        <button
          onClick={downloadTemplate}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors shadow-sm"
        >
          <Download size={16} />
          Download Template
        </button>
      </div>

      <div
        className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
          dragActive
            ? 'border-blue-500 bg-blue-50'
            : file
            ? 'border-blue-500 bg-blue-50/10'
            : 'border-slate-300 bg-slate-50 hover:border-slate-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {!file ? (
          <div className="flex flex-col items-center">
            <div className="mb-4 p-4 bg-white rounded-full shadow-sm ring-1 ring-slate-200">
                <Upload className="text-slate-400" size={32} />
            </div>
            <p className="text-slate-900 font-semibold mb-2 text-base">
              Drag & drop your file here
            </p>
            <p className="text-slate-400 text-sm mb-6">Supported formats: CSV, Excel (.xlsx)</p>
            <label
              htmlFor="file-input"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-lg font-semibold text-sm cursor-pointer hover:bg-slate-800 transition-colors shadow-sm"
            >
              Browse Files
            </label>
            <input
              id="file-input"
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileInput}
              className="hidden"
            />
          </div>
        ) : (
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                <FileSpreadsheet size={24} />
              </div>
              <div className="text-left">
                <p className="text-slate-900 font-semibold text-sm truncate max-w-[200px]">{file.name}</p>
                <p className="text-slate-500 text-xs">{(file.size / 1024).toFixed(2)} KB</p>
              </div>
            </div>
            <button
              onClick={handleClear}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Remove file"
            >
              <X size={20} />
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-700">
          <AlertTriangle size={20} className="flex-shrink-0 mt-0.5" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {uploadResult && (
        <div className="space-y-4">
             <div
            className={`p-5 rounded-xl border ${
                uploadResult.error_count > 0
                ? 'bg-amber-50 border-amber-200'
                : 'bg-green-50 border-green-200'
            }`}
            >
            <div className="flex items-center gap-3 mb-4">
                {uploadResult.error_count === 0 ? (
                <CheckCircle className="text-green-600" size={20} />
                ) : (
                <AlertTriangle className="text-amber-600" size={20} />
                )}
                <span className={`font-semibold text-sm ${
                uploadResult.error_count === 0 ? 'text-green-700' : 'text-amber-700'
                }`}>
                {uploadResult.message}
                </span>
            </div>
            
            <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-white/60 p-3 rounded-lg border border-transparent">
                    <span className="block text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Total</span>
                    <span className="block text-lg font-bold text-slate-800">{uploadResult.total_records}</span>
                </div>
                <div className="bg-emerald-100/50 p-3 rounded-lg border border-emerald-100/50">
                    <span className="block text-xs text-emerald-700 uppercase font-bold tracking-wider mb-1">Success</span>
                    <span className="block text-lg font-bold text-emerald-700">{uploadResult.success_count}</span>
                </div>
                {uploadResult.error_count > 0 && (
                <div className="bg-red-100/50 p-3 rounded-lg border border-red-100/50">
                    <span className="block text-xs text-red-700 uppercase font-bold tracking-wider mb-1">Failed</span>
                    <span className="block text-lg font-bold text-red-700">{uploadResult.error_count}</span>
                </div>
                )}
            </div>

            {uploadResult.sample_errors && uploadResult.sample_errors.length > 0 && (
                <div className="mb-4 p-4 bg-white rounded-lg border border-red-200 text-xs">
                    <p className="font-bold text-red-700 mb-2 uppercase tracking-wide">Error Log Sample:</p>
                    <ul className="list-disc list-inside text-red-600 space-y-1 font-mono">
                        {uploadResult.sample_errors.map((err, idx) => (
                        <li key={idx}>{err}</li>
                        ))}
                    </ul>
                </div>
            )}
            
            <div className="flex items-start gap-2 p-3 bg-white/60 rounded-lg text-xs text-slate-600">
                <Lightbulb className="text-amber-500 flex-shrink-0 mt-0.5" size={16} />
                <span>
                <strong>Tip:</strong> Head over to the Dashboard to see your new data in action.
                </span>
            </div>
            
            </div>
             {onSwitchToOverview && (
                <button
                onClick={onSwitchToOverview}
                className="w-full px-5 py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 active:transform active:scale-[0.99] transition-all shadow-md shadow-blue-600/20"
                >
                Go to Dashboard
                </button>
            )}
        </div>
      )}

      {/* Upload Button - Only show if not successful already or if we want to allow re-upload immediately */}
      {!uploadResult && (
        <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full flex items-center justify-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 active:scale-[0.99] transition-all shadow-md shadow-blue-600/20"
        >
            {uploading ? (
            <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing Data...
            </>
            ) : (
            <>
                Start Upload
            </>
            )}
        </button>
      )}

      <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
        <p className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
           Requirements
        </p>
        <ul className="space-y-2 text-xs text-slate-600">
          <li className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5"></div>
            <span><strong>Required:</strong> service_name, cost, date column</span>
          </li>
          <li className="flex items-start gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5"></div>
            <span><strong>Optional:</strong> provider, region, usage_end_date (auto-detected if missing)</span>
          </li>
          <li className="flex items-start gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5"></div>
            <span><strong>Supported formats:</strong> Custom CSV, Azure/AWS/GCP billing exports</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default FileUpload;
