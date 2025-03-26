"use client";
import { Dialog } from "@headlessui/react";
import { X } from "lucide-react";
import { useState } from "react";

export default function AnnotationPopup({ isOpen, onClose, onSave }) {
  const [text, setText] = useState("");
  const [color, setColor] = useState("");

  const handleSubmit = () => {
    if (text && color) {
      onSave({ text, color });
      setText("");
      setColor("");
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl relative space-y-4">
          <button
            className="absolute top-3 right-3 text-gray-400 hover:text-red-500"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </button>
          <Dialog.Title className="text-lg font-semibold text-gray-800">
            Ajouter un commentaire
          </Dialog.Title>

          <div className="space-y-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-md p-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Saisir un commentaire..."
            />

            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">Niveau d'impact :</p>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1">
                  <input type="radio" name="color" value="green" onChange={() => setColor("green")} />
                  🟢 Faible
                </label>
                <label className="flex items-center gap-1">
                  <input type="radio" name="color" value="yellow" onChange={() => setColor("yellow")} />
                  🟡 Moyen
                </label>
                <label className="flex items-center gap-1">
                  <input type="radio" name="color" value="red" onChange={() => setColor("red")} />
                  🔴 Critique
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={!text || !color}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              Valider
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
