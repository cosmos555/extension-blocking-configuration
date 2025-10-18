'use client';

import { useState, useEffect } from 'react';
import { BlockedExtension } from '@/types';

const FIXED_EXTENSIONS = ['bat', 'cmd', 'com', 'cpl', 'exe', 'scr', 'js'];
const MAX_CUSTOM_EXTENSIONS = 200;
const MAX_EXTENSION_BYTES = 20;

export default function ExtensionManager() {
  const [extensions, setExtensions] = useState<Map<number, BlockedExtension>>(new Map());
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    // 초기 데이터 로드
    fetchBlockedExtensions();
  }, []);

  const fetchBlockedExtensions = async () => {
    try {
      const response = await fetch('/api/blocked-extensions');
      const data = await response.json();

      const extMap = new Map<number, BlockedExtension>();
      data.extensions.forEach((ext: BlockedExtension) => {
        if (ext.ext_id) {
          extMap.set(ext.ext_id, ext);
        }
      });

      setExtensions(extMap);
    } catch (error) {
      console.error('Failed to fetch extensions:', error);
    }
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

  // 고정 확장자 토글 (즉시 저장)
  const handleFixedToggle = async (name: string) => {
    // 현재 상태 확인
    const existingExt = Array.from(extensions.values()).find(ext => ext.name === name);

    if (existingExt && existingExt.ext_id) {
      // 기존 레코드가 있으면 blocked 값 토글
      const newBlocked = existingExt.blocked === 1 ? 0 : 1;

      try {
        const response = await fetch(`/api/blocked-extensions/${existingExt.ext_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ blocked: newBlocked })
        });

        if (response.ok) {
          // 로컬 상태 업데이트
          const updated = { ...existingExt, blocked: newBlocked };
          setExtensions(prev => {
            const newMap = new Map(prev);
            newMap.set(existingExt.ext_id!, updated);
            return newMap;
          });
        }
      } catch (error) {
        console.error('Failed to toggle extension:', error);
        alert('변경에 실패했습니다.');
      }
    } else {
      // 새 레코드 생성
      try {
        const response = await fetch('/api/blocked-extensions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, blocked: 1 })
        });

        if (response.ok) {
          const data = await response.json();
          const newExt: BlockedExtension = {
            ext_id: data.ext_id,
            name,
            blocked: 1
          };

          setExtensions(prev => {
            const newMap = new Map(prev);
            newMap.set(data.ext_id, newExt);
            return newMap;
          });
        }
      } catch (error) {
        console.error('Failed to add extension:', error);
        alert('추가에 실패했습니다.');
      }
    }
  };

  // 커스텀 확장자 추가 (즉시 저장)
  const handleAddCustom = async () => {
    const trimmed = inputValue.trim().toLowerCase();

    if (!trimmed) return;

    if (getByteLength(trimmed) > MAX_EXTENSION_BYTES) {
      alert(`확장자는 최대 ${MAX_EXTENSION_BYTES}바이트까지 입력 가능합니다.`);
      return;
    }

    // 커스텀 확장자 개수 체크 (고정 확장자 제외)
    const customCount = Array.from(extensions.values()).filter(
      ext => !FIXED_EXTENSIONS.includes(ext.name) && ext.blocked === 1
    ).length;

    if (customCount >= MAX_CUSTOM_EXTENSIONS) {
      alert(`최대 ${MAX_CUSTOM_EXTENSIONS}개까지만 추가할 수 있습니다.`);
      return;
    }

    // 이미 존재하는지 확인
    const existing = Array.from(extensions.values()).find(ext => ext.name === trimmed);
    if (existing && existing.blocked === 1) {
      alert('이미 추가된 확장자입니다.');
      return;
    }

    if (FIXED_EXTENSIONS.includes(trimmed)) {
      alert('고정 확장자는 위에서 체크해주세요.');
      return;
    }

    try {
      const response = await fetch('/api/blocked-extensions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed, blocked: 1 })
      });

      if (response.ok) {
        const data = await response.json();
        const newExt: BlockedExtension = {
          ext_id: data.ext_id,
          name: trimmed,
          blocked: 1
        };

        setExtensions(prev => {
          const newMap = new Map(prev);
          newMap.set(data.ext_id, newExt);
          return newMap;
        });

        setInputValue('');
      }
    } catch (error) {
      console.error('Failed to add extension:', error);
      alert('추가에 실패했습니다.');
    }
  };

  // 커스텀 확장자 제거 (즉시 저장 - blocked를 0으로)
  const handleRemoveCustom = async (ext_id: number) => {
    const ext = extensions.get(ext_id);
    if (!ext) return;

    try {
      const response = await fetch(`/api/blocked-extensions/${ext_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocked: 0 })
      });

      if (response.ok) {
        // 로컬 상태 업데이트 (blocked를 0으로)
        const updated = { ...ext, blocked: 0 };
        setExtensions(prev => {
          const newMap = new Map(prev);
          newMap.set(ext_id, updated);
          return newMap;
        });
      }
    } catch (error) {
      console.error('Failed to remove extension:', error);
      alert('제거에 실패했습니다.');
    }
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
            {FIXED_EXTENSIONS.map((name) => {
              const ext = Array.from(extensions.values()).find(e => e.name === name);
              const isChecked = ext?.blocked === 1;

              return (
                <label
                  key={name}
                  className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-3 py-2 rounded-md transition-colors"
                >
                  <input
                    type="checkbox"
                    className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
                    checked={isChecked}
                    onChange={() => handleFixedToggle(name)}
                  />
                  <span className="text-gray-700 font-medium">{name}</span>
                </label>
              );
            })}
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
              placeholder="확장자 입력 (예: sh, py)"
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
            {Array.from(extensions.values()).filter(
              ext => !FIXED_EXTENSIONS.includes(ext.name) && ext.blocked === 1
            ).length} / {MAX_CUSTOM_EXTENSIONS}
          </div>

          {/* 태그 컨테이너 */}
          <div className="min-h-[120px] p-4 bg-gray-50 border border-gray-200 rounded-lg">
            {(() => {
              const customExts = Array.from(extensions.values()).filter(
                ext => !FIXED_EXTENSIONS.includes(ext.name) && ext.blocked === 1
              );

              return customExts.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {customExts.map((ext) => (
                    <div
                      key={ext.ext_id}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-md shadow-sm"
                    >
                      <span className="text-sm font-medium text-gray-700">{ext.name}</span>
                      <button
                        onClick={() => handleRemoveCustom(ext.ext_id!)}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                        aria-label={`${ext.name} 제거`}
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
              );
            })()}
          </div>

        </div>
      </div>
    </div>
  );
}
