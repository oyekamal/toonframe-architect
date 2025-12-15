import React, { useState } from 'react';
import { StoryboardData } from '../types';
import { downloadImagesAsZip, downloadStoryboardAsPDF, areAllImagesGenerated, getGeneratedImagesCount } from '../services/downloadService';
import { LoadingSpinner } from './LoadingSpinner';

interface DownloadSectionProps {
  storyboard: StoryboardData;
  characterImage: string | null;
}

export const DownloadSection: React.FC<DownloadSectionProps> = ({ storyboard, characterImage }) => {
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [isDownloadingComplete, setIsDownloadingComplete] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const { total, generated } = getGeneratedImagesCount(storyboard);
  const allImagesGenerated = areAllImagesGenerated(storyboard);

  const handleDownloadPDF = async () => {
    setIsDownloadingPDF(true);
    setDownloadError(null);
    
    try {
      await downloadStoryboardAsPDF(storyboard, characterImage);
    } catch (error) {
      console.error('PDF download failed:', error);
      setDownloadError('Failed to generate PDF. Please try again.');
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  const handleDownloadZip = async () => {
    if (!allImagesGenerated) {
      setDownloadError('Please wait for all images to be generated before downloading.');
      return;
    }

    setIsDownloadingZip(true);
    setDownloadError(null);
    
    try {
      await downloadImagesAsZip(storyboard, characterImage);
    } catch (error) {
      console.error('ZIP download failed:', error);
      setDownloadError('Failed to create ZIP file. Please try again.');
    } finally {
      setIsDownloadingZip(false);
    }
  };

  const handleDownloadComplete = async () => {
    if (!allImagesGenerated) {
      setDownloadError('Please wait for all images to be generated before downloading the complete package.');
      return;
    }

    setIsDownloadingComplete(true);
    setDownloadError(null);
    
    try {
      // Download both PDF and ZIP
      await Promise.all([
        downloadStoryboardAsPDF(storyboard, characterImage),
        downloadImagesAsZip(storyboard, characterImage)
      ]);
    } catch (error) {
      console.error('Complete package download failed:', error);
      setDownloadError('Failed to create complete package. Please try again.');
    } finally {
      setIsDownloadingComplete(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-gradient-to-tr from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
          <span className="text-white text-lg">📁</span>
        </div>
        <h2 className="text-xl font-bold text-slate-800">Download Storyboard</h2>
      </div>

      {/* Download Status */}
      <div className="bg-slate-50 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-600">Image Generation Progress</span>
          <span className="text-sm font-medium text-slate-800">{generated}/{total} images</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              allImagesGenerated ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{ width: `${(generated / total) * 100}%` }}
          />
        </div>
        {!allImagesGenerated && (
          <p className="text-xs text-slate-500 mt-2">
            Images are still being generated. You can download the PDF now, but wait for all images before downloading the ZIP.
          </p>
        )}
      </div>

      {/* Error Message */}
      {downloadError && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200 mb-4 flex items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm">{downloadError}</span>
        </div>
      )}

      {/* Download Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* PDF Download */}
        <button
          onClick={handleDownloadPDF}
          disabled={isDownloadingPDF}
          className={`flex items-center justify-center gap-3 p-4 rounded-lg border-2 transition-all font-medium
            ${isDownloadingPDF
              ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
              : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100 hover:border-red-300 active:scale-95'
            }`}
        >
          {isDownloadingPDF ? (
            <>
              <LoadingSpinner />
              <span>Generating PDF...</span>
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div className="text-left">
                <div className="font-semibold">Download Complete PDF</div>
                <div className="text-xs opacity-75">Script, images, and descriptions</div>
              </div>
            </>
          )}
        </button>

        {/* ZIP Download */}
        <button
          onClick={handleDownloadZip}
          disabled={isDownloadingZip || !allImagesGenerated}
          className={`flex items-center justify-center gap-3 p-4 rounded-lg border-2 transition-all font-medium
            ${isDownloadingZip || !allImagesGenerated
              ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
              : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300 active:scale-95'
            }`}
        >
          {isDownloadingZip ? (
            <>
              <LoadingSpinner />
              <span>Creating ZIP...</span>
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
              <div className="text-left">
                <div className="font-semibold">Download Images ZIP</div>
                <div className="text-xs opacity-75">
                  {allImagesGenerated ? 'All images ready' : `${generated}/${total} images ready`}
                </div>
              </div>
            </>
          )}
        </button>

        {/* Complete Package Download */}
        <button
          onClick={handleDownloadComplete}
          disabled={isDownloadingComplete || !allImagesGenerated}
          className={`flex items-center justify-center gap-3 p-4 rounded-lg border-2 transition-all font-medium
            ${isDownloadingComplete || !allImagesGenerated
              ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
              : 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 hover:border-purple-300 active:scale-95'
            }`}
        >
          {isDownloadingComplete ? (
            <>
              <LoadingSpinner />
              <span>Creating Package...</span>
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 009.586 13H7" />
              </svg>
              <div className="text-left">
                <div className="font-semibold">Complete Package</div>
                <div className="text-xs opacity-75">
                  PDF + ZIP Bundle
                </div>
              </div>
            </>
          )}
        </button>
      </div>

      {/* Download Info */}
      <div className="mt-4 p-4 bg-slate-50 rounded-lg">
        <h3 className="font-semibold text-slate-800 mb-2 text-sm">Download Contents:</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
          <div>
            <strong className="text-red-600">📄 Complete PDF includes:</strong>
            <ul className="mt-1 space-y-1 ml-4">
              <li>• Character reference sheet (front/side/back)</li>
              <li>• Character & environment descriptions</li>
              <li>• Detailed motion prompts (step-by-step)</li>
              <li>• Character consistency tracking</li>
              <li>• Direction, expression & pose data</li>
              <li>• Scene descriptions & context</li>
              <li>• All generated images</li>
            </ul>
          </div>
          <div>
            <strong className="text-blue-600">📁 Enhanced ZIP includes:</strong>
            <ul className="mt-1 space-y-1 ml-4">
              <li>• Character reference sheet (3 views)</li>
              <li>• High-resolution images (A & B pairs)</li>
              <li>• Complete JSON metadata</li>
              <li>• Motion prompts text file</li>
              <li>• Character consistency guide</li>
              <li>• Comprehensive README</li>
            </ul>
          </div>
          <div>
            <strong className="text-purple-600">📦 Complete Package:</strong>
            <ul className="mt-1 space-y-1 ml-4">
              <li>• Everything from PDF & ZIP</li>
              <li>• Professional presentation-ready</li>
              <li>• All metadata & consistency data</li>
              <li>• Ready for video production</li>
              <li>• Complete project archive</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};