'use client';

import { useState, useEffect } from 'react';

const FIXED_EXTENSIONS = ['bat', 'cmd', 'com', 'cpl', 'exe', 'scr', 'js'];
const MAX_CUSTOM_EXTENSIONS = 200;
const MAX_EXTENSION_BYTES = 20;

export default function ExtensionManager() {
  const [fixedExtensions, setFixedExtensions] = useState<Set<string>>(new Set());
  const [customExtensions, setCustomExtensions] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    // 초기 데이터 로드
    fetchBlockedExtensions();
  }, []);

  const fetchBlockedExtensions = async () => {
    try {
      const response = await fetch('/api/blocked-extensions');
      const data = await response.json();

      const fixed = new Set<string>();
      const custom: string[] = [];

      data.extensions.forEach((ext: string) => {
        if (FIXED_EXTENSIONS.includes(ext)) {
          fixed.add(ext);
        } else {
          custom.push(ext);
        }
      });

      setFixedExtensions(fixed);
      setCustomExtensions(custom);
    } catch (error) {
      console.error('Failed to fetch extensions:', error);
    }
  };

  const handleFixedToggle = (ext: string) => {
    const newSet = new Set(fixedExtensions);
    if (newSet.has(ext)) {
      newSet.delete(ext);
    } else {
      newSet.add(ext);
    }
    setFixedExtensions(newSet);
  };

  const getByteLength = (str: string) => {
    return new Blob([str]).size;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (getByteLength(value) <= MAX_EXTENSION_BYTES) {
      setInputValue(value);
    }
  };

  const handleAddCustom = () => {
    const trimmed = inputValue.trim().toLowerCase();

    if (!trimmed) return;

    if (getByteLength(trimmed) > MAX_EXTENSION_BYTES) {
      alert(`확장자는 최대 ${MAX_EXTENSION_BYTES}바이트까지 입력 가능합니다.`);
      return;
    }

    if (customExtensions.length >= MAX_CUSTOM_EXTENSIONS) {
      alert(`최대 ${MAX_CUSTOM_EXTENSIONS}개까지만 추가할 수 있습니다.`);
      return;
    }

    if (customExtensions.includes(trimmed)) {
      alert('이미 추가된 확장자입니다.');
      return;
    }

    if (FIXED_EXTENSIONS.includes(trimmed)) {
      alert('고정 확장자는 위에서 체크해주세요.');
      return;
    }

    setCustomExtensions([...customExtensions, trimmed]);
    setInputValue('');
  };

  const handleRemoveCustom = (ext: string) => {
    setCustomExtensions(customExtensions.filter(e => e !== ext));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddCustom();
    }
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-800">확장자 필터 설정</h1>
          <p className="text-sm text-gray-500 mt-1">차단할 파일 확장자를 선택하고 관리하세요</p>
        </div>

        {/* 고정 확장자 섹션 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">고정 확장자</h2>
          <div className="flex flex-wrap gap-4">
            {FIXED_EXTENSIONS.map((ext) => (
              <label
                key={ext}
                className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-3 py-2 rounded-md transition-colors"
              >
                <input
                  type="checkbox"
                  className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
                  checked={fixedExtensions.has(ext)}
                  onChange={() => handleFixedToggle(ext)}
                />
                <span className="text-gray-700 font-medium">{ext}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 커스텀 확장자 섹션 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">커스텀 확장자</h2>

          {/* 입력 영역 */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="확장자 입력 (예: pdf, docx)"
              value={inputValue}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
            />
            <button
              onClick={handleAddCustom}
              className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              + 추가
            </button>
          </div>

          {/* 카운터 */}
          <div className="text-sm text-gray-500 mb-3">
            {customExtensions.length} / {MAX_CUSTOM_EXTENSIONS}
          </div>

          {/* 태그 컨테이너 */}
          <div className="min-h-[120px] p-4 bg-gray-50 border border-gray-200 rounded-lg">
            {customExtensions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {customExtensions.map((ext) => (
                  <div
                    key={ext}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-md shadow-sm"
                  >
                    <span className="text-sm font-medium text-gray-700">{ext}</span>
                    <button
                      onClick={() => handleRemoveCustom(ext)}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                      aria-label={`${ext} 제거`}
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 italic">
                추가된 커스텀 확장자가 없습니다.
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
