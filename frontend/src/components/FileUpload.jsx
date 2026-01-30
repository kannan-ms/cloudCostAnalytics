import { useState } from 'react';
import axios from 'axios';
import '../styles/FileUpload.css';

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
    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
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
      const token = localStorage.getItem('token');
      const response = await axios.post('http://localhost:5000/api/costs/upload', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      console.log('Upload successful:', response.data);
      setUploadResult(response.data);
      
      // Don't clear the file immediately - keep it visible with success message
      // setFile(null);
      
      // Call parent callback to refresh data
      if (onUploadSuccess) {
        console.log('Calling onUploadSuccess to refresh dashboard...');
        setTimeout(() => {
          onUploadSuccess();
        }, 500); // Small delay to ensure state updates
      }
    } catch (err) {
      console.error('Upload error:', err);
      console.error('Error details:', err.response?.data);
      setError(err.response?.data?.error || 'Failed to upload file. Please try again.');
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
    <div className="file-upload-container">
      <div className="file-upload-header">
        <h3>📂 Upload Cost Data</h3>
        <button onClick={downloadTemplate} className="template-btn">
          📥 Download Template
        </button>
      </div>

      <div 
        className={`file-drop-zone ${dragActive ? 'drag-active' : ''} ${file ? 'has-file' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {!file ? (
          <>
            <div className="upload-icon">📤</div>
            <p className="upload-text">
              Drag & drop your cost file here
            </p>
            <p className="upload-subtext">or</p>
            <label htmlFor="file-input" className="file-input-label">
              Browse Files
            </label>
            <input
              id="file-input"
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileInput}
              style={{ display: 'none' }}
            />
            <p className="upload-hint">Supported formats: CSV, Excel (.xlsx, .xls)</p>
          </>
        ) : (
          <div className="file-selected">
            <div className="file-info">
              <span className="file-icon">📄</span>
              <div className="file-details">
                <p className="file-name">{file.name}</p>
                <p className="file-size">{(file.size / 1024).toFixed(2)} KB</p>
              </div>
            </div>
            <button onClick={handleClear} className="clear-btn" title="Remove file">
              ✕
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="upload-message error-message">
          <span className="message-icon">❌</span>
          <span>{error}</span>
        </div>
      )}

      {uploadResult && (
        <div className={`upload-message ${uploadResult.error_count > 0 ? 'warning-message' : 'success-message'}`}>
          <div className="result-header">
            <span className="message-icon">
              {uploadResult.error_count === 0 ? '✅' : '⚠️'}
            </span>
            <span className="result-title">{uploadResult.message}</span>
          </div>
          <div className="result-stats">
            <div className="stat">
              <span className="stat-label">Total Records:</span>
              <span className="stat-value">{uploadResult.total_records}</span>
            </div>
            <div className="stat success">
              <span className="stat-label">Success:</span>
              <span className="stat-value">{uploadResult.success_count}</span>
            </div>
            {uploadResult.error_count > 0 && (
              <div className="stat error">
                <span className="stat-label">Failed:</span>
                <span className="stat-value">{uploadResult.error_count}</span>
              </div>
            )}
          </div>
          {uploadResult.sample_errors && uploadResult.sample_errors.length > 0 && (
            <div className="error-details">
              <p className="error-details-title">Sample Errors:</p>
              <ul>
                {uploadResult.sample_errors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}
          <div style={{ marginTop: '12px', padding: '8px', background: 'rgba(0,0,0,0.05)', borderRadius: '4px', fontSize: '13px' }}>
            💡 <strong>Tip:</strong> Go to the "Overview" or "Cost Trends" tab to see your uploaded data visualized!
          </div>
          {onSwitchToOverview && (
            <button 
              onClick={onSwitchToOverview}
              style={{
                marginTop: '12px',
                padding: '10px 20px',
                background: '#0056b3',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px'
              }}
            >
              📊 View Dashboard
            </button>
          )}
        </div>
      )}

      <div className="upload-actions">
        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="upload-btn"
        >
          {uploading ? (
            <>
              <span className="spinner"></span>
              Uploading...
            </>
          ) : (
            <>
              <span>📤</span>
              Upload File
            </>
          )}
        </button>
      </div>

      <div className="upload-info">
        <p className="info-title">📋 File Format Requirements:</p>
        <ul className="info-list">
          <li><strong>Required columns:</strong> provider, service_name, cost, usage_start_date, usage_end_date</li>
          <li><strong>Optional columns:</strong> region, cloud_account_id, resource_id, usage_quantity, usage_unit, currency</li>
          <li><strong>Date format:</strong> YYYY-MM-DD (e.g., 2026-01-01)</li>
          <li><strong>Download the template</strong> above to see the correct format</li>
        </ul>
      </div>
    </div>
  );
};

export default FileUpload;
