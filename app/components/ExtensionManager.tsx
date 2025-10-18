'use client';

import { useState, useEffect } from 'react';
import { BlockedExtension } from '@/types';

const FIXED_EXTENSIONS = ['bat', 'cmd', 'com', 'cpl', 'exe', 'scr', 'js'];
const MAX_CUSTOM_EXTENSIONS = 200;
const MAX_EXTENSION_BYTES = 20;

interface Toast {
  id: string;
  type: 'success' | 'error';
  message: string;
}

export default function ExtensionManager() {
  const [extensions, setExtensions] = useState<Map<number, BlockedExtension>>(new Map());
  const [inputValue, setInputValue] = useState('');
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [savingItems, setSavingItems] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    // 초기 데이터 로드
    fetchBlockedExtensions();
  }, []);

  const showToast = (type: 'success' | 'error', message: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, type, message }]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const addSavingItem = (key: string) => {
    setSavingItems(prev => new Set(prev).add(key));
  };

  const removeSavingItem = (key: string) => {
    setSavingItems(prev => {
      const newSet = new Set(prev);
      newSet.delete(key);
      return newSet;
    });
  };

  const fetchBlockedExtensions = async () => {
    setIsInitialLoading(true);
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
      showToast('error', '확장자 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsInitialLoading(false);
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

  // 고정 확장자 토글 (즉시 저장 + Optimistic UI)
  const handleFixedToggle = async (name: string) => {
    // 현재 상태 확인
    const existingExt = Array.from(extensions.values()).find(ext => ext.name === name);

    if (existingExt && existingExt.ext_id) {
      // 기존 레코드가 있으면 blocked 값 토글
      const newBlocked = existingExt.blocked === 1 ? 0 : 1;
      const savingKey = `fixed-${name}`;

      // Optimistic UI: 즉시 상태 업데이트
      const updated = { ...existingExt, blocked: newBlocked };
      setExtensions(prev => {
        const newMap = new Map(prev);
        newMap.set(existingExt.ext_id!, updated);
        return newMap;
      });

      // 저장 중 표시
      addSavingItem(savingKey);

      try {
        const response = await fetch(`/api/blocked-extensions/${existingExt.ext_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ blocked: newBlocked })
        });

        if (!response.ok) {
          // 실패 시 롤백
          setExtensions(prev => {
            const newMap = new Map(prev);
            newMap.set(existingExt.ext_id!, existingExt);
            return newMap;
          });
          showToast('error', '변경에 실패했습니다.');
        }
      } catch (error) {
        console.error('Failed to toggle extension:', error);
        // 실패 시 롤백
        setExtensions(prev => {
          const newMap = new Map(prev);
          newMap.set(existingExt.ext_id!, existingExt);
          return newMap;
        });
        showToast('error', '변경에 실패했습니다.');
      } finally {
        removeSavingItem(savingKey);
      }
    } else {
      // 새 레코드 생성
      const savingKey = `fixed-${name}`;
      const tempId = -Date.now(); // 임시 ID (음수로 구분)

      // Optimistic UI: 임시 레코드 추가
      const tempExt: BlockedExtension = {
        ext_id: tempId,
        name,
        blocked: 1
      };

      setExtensions(prev => {
        const newMap = new Map(prev);
        newMap.set(tempId, tempExt);
        return newMap;
      });

      // 저장 중 표시
      addSavingItem(savingKey);

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

          // 임시 레코드를 실제 레코드로 교체
          setExtensions(prev => {
            const newMap = new Map(prev);
            newMap.delete(tempId);
            newMap.set(data.ext_id, newExt);
            return newMap;
          });
        } else {
          // 실패 시 임시 레코드 제거
          setExtensions(prev => {
            const newMap = new Map(prev);
            newMap.delete(tempId);
            return newMap;
          });
          showToast('error', '추가에 실패했습니다.');
        }
      } catch (error) {
        console.error('Failed to add extension:', error);
        // 실패 시 임시 레코드 제거
        setExtensions(prev => {
          const newMap = new Map(prev);
          newMap.delete(tempId);
          return newMap;
        });
        showToast('error', '추가에 실패했습니다.');
      } finally {
        removeSavingItem(savingKey);
      }
    }
  };

  // 커스텀 확장자 추가 (즉시 저장 + Optimistic UI)
  const handleAddCustom = async () => {
    const trimmed = inputValue.trim().toLowerCase();

    if (!trimmed) return;

    if (getByteLength(trimmed) > MAX_EXTENSION_BYTES) {
      showToast('error', `확장자는 최대 ${MAX_EXTENSION_BYTES}바이트까지 입력 가능합니다.`);
      return;
    }

    // 커스텀 확장자 개수 체크 (고정 확장자 제외, 임시 ID 제외)
    const customCount = Array.from(extensions.values()).filter(
      ext => !FIXED_EXTENSIONS.includes(ext.name) && ext.blocked === 1 && ext.ext_id && ext.ext_id > 0
    ).length;

    if (customCount >= MAX_CUSTOM_EXTENSIONS) {
      showToast('error', `최대 ${MAX_CUSTOM_EXTENSIONS}개까지만 추가할 수 있습니다.`);
      return;
    }

    // 이미 존재하는지 확인
    const existing = Array.from(extensions.values()).find(ext => ext.name === trimmed);
    if (existing && existing.blocked === 1) {
      showToast('error', '이미 추가된 확장자입니다.');
      return;
    }

    if (FIXED_EXTENSIONS.includes(trimmed)) {
      showToast('error', '고정 확장자는 위에서 체크해주세요.');
      return;
    }

    const tempId = -Date.now(); // 임시 ID (음수로 구분)
    const savingKey = `custom-add-${trimmed}`;

    // Optimistic UI: 임시 레코드 추가
    const tempExt: BlockedExtension = {
      ext_id: tempId,
      name: trimmed,
      blocked: 1
    };

    setExtensions(prev => {
      const newMap = new Map(prev);
      newMap.set(tempId, tempExt);
      return newMap;
    });

    // 입력 필드 즉시 클리어
    setInputValue('');

    // 저장 중 표시
    addSavingItem(savingKey);

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

        // 임시 레코드를 실제 레코드로 교체
        setExtensions(prev => {
          const newMap = new Map(prev);
          newMap.delete(tempId);
          newMap.set(data.ext_id, newExt);
          return newMap;
        });
      } else {
        // 실패 시 임시 레코드 제거
        setExtensions(prev => {
          const newMap = new Map(prev);
          newMap.delete(tempId);
          return newMap;
        });
        showToast('error', '추가에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to add extension:', error);
      // 실패 시 임시 레코드 제거
      setExtensions(prev => {
        const newMap = new Map(prev);
        newMap.delete(tempId);
        return newMap;
      });
      showToast('error', '추가에 실패했습니다.');
    } finally {
      removeSavingItem(savingKey);
    }
  };

  // 커스텀 확장자 제거 (즉시 저장 - blocked를 0으로 + Optimistic UI)
  const handleRemoveCustom = async (ext_id: number) => {
    const ext = extensions.get(ext_id);
    if (!ext) return;

    const savingKey = `custom-remove-${ext_id}`;

    // Optimistic UI: 즉시 제거
    setExtensions(prev => {
      const newMap = new Map(prev);
      const updated = { ...ext, blocked: 0 };
      newMap.set(ext_id, updated);
      return newMap;
    });

    // 저장 중 표시 (실제로는 이미 제거되어서 보이지 않을 수 있음)
    addSavingItem(savingKey);

    try {
      const response = await fetch(`/api/blocked-extensions/${ext_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocked: 0 })
      });

      if (!response.ok) {
        // 실패 시 롤백
        setExtensions(prev => {
          const newMap = new Map(prev);
          newMap.set(ext_id, ext);
          return newMap;
        });
        showToast('error', '제거에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to remove extension:', error);
      // 실패 시 롤백
      setExtensions(prev => {
        const newMap = new Map(prev);
        newMap.set(ext_id, ext);
        return newMap;
      });
      showToast('error', '제거에 실패했습니다.');
    } finally {
      removeSavingItem(savingKey);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddCustom();
    }
  };

  // Spinner 컴포넌트
  const Spinner = ({ size = 'sm' }: { size?: 'sm' | 'md' | 'lg' }) => {
    const sizeClass = size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-6 h-6' : 'w-8 h-8';
    return (
      <svg className={`animate-spin ${sizeClass}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    );
  };

  // 초기 로딩 UI
  if (isInitialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600">확장자 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Toast 알림 */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-lg shadow-lg text-white flex items-center gap-2 animate-slide-in ${
              toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
            }`}
          >
            {toast.type === 'success' ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            )}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>

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
              const isSaving = savingItems.has(`fixed-${name}`);

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
                    disabled={isSaving}
                  />
                  <span className="text-gray-700 font-medium">{name}</span>
                  {isSaving && (
                    <div className="ml-1">
                      <Spinner size="sm" />
                    </div>
                  )}
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
                  {customExts.map((ext) => {
                    const isSaving = savingItems.has(`custom-add-${ext.name}`) || savingItems.has(`custom-remove-${ext.ext_id}`);

                    return (
                      <div
                        key={ext.ext_id}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-md shadow-sm"
                      >
                        <span className="text-sm font-medium text-gray-700">{ext.name}</span>
                        {isSaving ? (
                          <Spinner size="sm" />
                        ) : (
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
                        )}
                      </div>
                    );
                  })}
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
    </>
  );
}
