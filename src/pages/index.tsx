'use client'

import React, { useEffect, useState } from 'react'

// Flash card with question (front: title/text + up to 3 images) and answer (back: text + optional image).

type CardImage = {
  id: string
  dataUrl: string
  name: string
}

type FlashCard = {
  id: string
  questionTitle: string
  questionText: string
  questionImages: CardImage[] // up to 3
  answerText: string
  answerImages: CardImage[] // optional, up to 1
  createdAt: string
}

const STORAGE_KEY = 'flash_cards_local_v2'

function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`
}

export default function FlashCardLocal() {
  const [qTitle, setQTitle] = useState('')
  const [qText, setQText] = useState('')
  const [qImages, setQImages] = useState<CardImage[]>([])
  const [aText, setAText] = useState('')
  const [aImages, setAImages] = useState<CardImage[]>([])
  const [cards, setCards] = useState<FlashCard[]>([])
  const [error, setError] = useState<string | null>(null)
  const [flippedId, setFlippedId] = useState<string | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setCards(JSON.parse(raw))
    } catch (e) {
      console.error(e)
      setError('Local storage-аас уншихад алдаа гарлаа')
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cards))
    } catch (e) {
      console.error(e)
      setError('Local storage-д бичихэд алдаа гарлаа')
    }
  }, [cards])

  function readFilesAsDataUrls(
    files: FileList | null,
    maxCount = 3,
    callback: (imgs: CardImage[]) => void
  ) {
    if (!files) return
    const arr: CardImage[] = []
    const max = Math.min(maxCount, files.length)
    let loaded = 0
    for (let i = 0; i < max; i++) {
      const f = files[i]
      const reader = new FileReader()
      reader.onload = (ev) => {
        arr.push({
          id: uid('img'),
          dataUrl: String(ev.target?.result || ''),
          name: f.name,
        })
        loaded++
        if (loaded === max) callback(arr)
      }
      reader.readAsDataURL(f)
    }
  }

  function onQFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    readFilesAsDataUrls(e.target.files, 3, (imgs) => {
      setQImages((prev) => {
        const merged = [...prev, ...imgs].slice(0, 3)
        return merged
      })
    })
    e.currentTarget.value = ''
  }

  function onAFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    readFilesAsDataUrls(e.target.files, 1, (imgs) => {
      setAImages((prev) => {
        const merged = [...prev, ...imgs].slice(0, 1)
        return merged
      })
    })
    e.currentTarget.value = ''
  }

  function removeQImage(id: string) {
    setQImages((s) => s.filter((x) => x.id !== id))
  }
  function removeAImage(id: string) {
    setAImages((s) => s.filter((x) => x.id !== id))
  }

  function saveCard() {
    if (!qTitle.trim() && !qText.trim() && qImages.length === 0) {
      setError(
        'Асуулийг дор хаяж нэг талбартаар оруулна уу (гарчиг, текст эсвэл зураг)'
      )
      return
    }

    const newCard: FlashCard = {
      id: uid('card'),
      questionTitle: qTitle.trim(),
      questionText: qText.trim(),
      questionImages: qImages.slice(0, 3),
      answerText: aText.trim(),
      answerImages: aImages.slice(0, 1),
      createdAt: new Date().toISOString(),
    }
    setCards((c) => [newCard, ...c])
    setQTitle('')
    setQText('')
    setQImages([])
    setAText('')
    setAImages([])
    setError(null)
  }

  function deleteCard(id: string) {
    if (!confirm('Та энэ карт-ыг устгахдаа итгэлтэй байна уу?')) return
    setCards((c) => c.filter((x) => x.id !== id))
  }

  function exportAll() {
    const data = JSON.stringify(cards, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'flash_cards_export.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  function importFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(
          String(ev.target?.result || '[]')
        ) as FlashCard[]
        if (!Array.isArray(parsed)) throw new Error('Invalid format')
        setCards((c) => {
          const merged = [...parsed, ...c]
          const seen = new Set()
          const deduped = merged.filter((it) => {
            if (seen.has(it.id)) return false
            seen.add(it.id)
            return true
          })
          return deduped
        })
      } catch (err) {
        alert('Файлыг унших үед алдаа гарлаа: ' + String(err))
      }
    }
    reader.readAsText(f)
    e.currentTarget.value = ''
  }

  // flip toggle
  function toggleFlip(id: string) {
    setFlippedId((cur) => (cur === id ? null : id))
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h2 className="text-2xl font-semibold mb-4">
        Flash Card — асуулттай, эргүүлэхэд хариулт
      </h2>

      <div className="bg-white shadow rounded p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block mb-2 font-medium">Асуулт: Гарчиг</label>
            <input
              value={qTitle}
              onChange={(e) => setQTitle(e.target.value)}
              className="w-full border rounded p-2 mb-3"
              placeholder="Асуултын гарчиг"
            />

            <label className="block mb-2 font-medium">Асуулт: Текст</label>
            <textarea
              value={qText}
              onChange={(e) => setQText(e.target.value)}
              className="w-full border rounded p-2 mb-3"
              rows={4}
              placeholder="Асуултын дэлгэрэнгүй текст"
            />

            <div className="mb-3">
              <div className="mb-1">Асуулт-д зураг (дээд тал 3):</div>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={onQFileChange}
              />
              <div className="flex gap-2 mt-3">
                {qImages.map((img) => (
                  <div
                    key={img.id}
                    className="relative w-24 h-24 border rounded overflow-hidden"
                  >
                    <img
                      src={img.dataUrl}
                      alt={img.name}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => removeQImage(img.id)}
                      className="absolute top-1 right-1 bg-black/50 text-white rounded px-1 text-xs"
                    >
                      X
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block mb-2 font-medium">Хариулт: Текст</label>
            <textarea
              value={aText}
              onChange={(e) => setAText(e.target.value)}
              className="w-full border rounded p-2 mb-3"
              rows={6}
              placeholder="Хариулт бичнэ үү (эргүүлэхэд харагдана)"
            />

            <div className="mb-3">
              <div className="mb-1">Хариулт-д зураг (сонголтоор):</div>
              <input type="file" accept="image/*" onChange={onAFileChange} />
              <div className="flex gap-2 mt-3">
                {aImages.map((img) => (
                  <div
                    key={img.id}
                    className="relative w-24 h-24 border rounded overflow-hidden"
                  >
                    <img
                      src={img.dataUrl}
                      alt={img.name}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => removeAImage(img.id)}
                      className="absolute top-1 right-1 bg-black/50 text-white rounded px-1 text-xs"
                    >
                      X
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {error && <div className="text-red-600 mb-3">{error}</div>}

        <div className="flex gap-2">
          <button
            onClick={saveCard}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Карт үүсгэх
          </button>
          <button
            onClick={() => {
              setQTitle('')
              setQText('')
              setQImages([])
              setAText('')
              setAImages([])
            }}
            className="px-4 py-2 bg-gray-200 rounded"
          >
            Цэвэрлэх
          </button>
          <button
            onClick={exportAll}
            className="px-4 py-2 bg-green-600 text-white rounded"
          >
            Экспорт
          </button>
          <label className="px-4 py-2 bg-yellow-200 rounded cursor-pointer">
            Импорт
            <input
              type="file"
              accept="application/json"
              onChange={importFile}
              className="hidden"
            />
          </label>
        </div>
      </div>

      <div>
        <h3 className="text-xl font-medium mb-3">Картууд ({cards.length})</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cards.map((c) => (
            <div key={c.id} className="border rounded p-3 bg-white shadow">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold">
                    {c.questionTitle || '(Гарчиггүй)'}
                  </div>
                  <div className="text-sm text-gray-600">
                    {new Date(c.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="text-right">
                  <button
                    onClick={() => deleteCard(c.id)}
                    className="text-sm text-red-600"
                  >
                    Устгах
                  </button>
                </div>
              </div>

              <div className="mt-3">
                {/* flip container */}
                <div
                  onClick={() => toggleFlip(c.id)}
                  className="w-full h-56 mx-auto cursor-pointer"
                >
                  <div style={{ perspective: 1000 }} className="w-full h-full">
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        position: 'relative',
                        transformStyle: 'preserve-3d',
                        transition: 'transform 400ms',
                        transform:
                          flippedId === c.id
                            ? 'rotateY(180deg)'
                            : 'rotateY(0deg)',
                      }}
                    >
                      {/* Front */}
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          backfaceVisibility: 'hidden',
                          WebkitBackfaceVisibility: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                        }}
                        className="p-3"
                      >
                        <div className="h-20 overflow-hidden">
                          <div className="font-medium">{c.questionTitle}</div>
                          <div className="text-sm text-gray-700">
                            {c.questionText}
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-3 gap-2">
                          {Array.from({ length: 3 }).map((_, i) => {
                            const img = c.questionImages[i]
                            return (
                              <div
                                key={i}
                                className="h-28 border rounded overflow-hidden flex items-center justify-center bg-gray-50"
                              >
                                {img ? (
                                  <img
                                    src={img.dataUrl}
                                    alt={img.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="text-xs text-gray-400">
                                    No image
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>

                        <div className="mt-auto text-xs text-gray-500">
                          Товшоор эргүүлж хариултыг үзнэ
                        </div>
                      </div>

                      {/* Back */}
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          transform: 'rotateY(180deg)',
                          backfaceVisibility: 'hidden',
                          WebkitBackfaceVisibility: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                        }}
                        className="p-3 bg-gray-50"
                      >
                        <div className="h-20 overflow-auto">
                          <div className="font-medium">Хариулт</div>
                          <div className="text-sm text-gray-800">
                            {c.answerText || '(Хариулт байхгүй)'}
                          </div>
                        </div>

                        <div className="mt-3 h-28 border rounded overflow-hidden flex items-center justify-center bg-white">
                          {c.answerImages[0] ? (
                            <img
                              src={c.answerImages[0].dataUrl}
                              alt={c.answerImages[0].name}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <div className="text-xs text-gray-400">
                              No answer image
                            </div>
                          )}
                        </div>

                        <div className="mt-auto text-xs text-gray-500">
                          Буцахын тулд дахин товшино уу
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
