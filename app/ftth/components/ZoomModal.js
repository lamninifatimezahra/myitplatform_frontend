"use client";
import { Dialog } from "@headlessui/react";
import { X, Pencil } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ZoomModal({ isOpen, onClose, title, onAnnotate, children }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog as="div" className="relative z-50" open={isOpen} onClose={onClose}>
          {/* Overlay */}
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />

          {/* Modale */}
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel
              as={motion.div}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="bg-white w-full max-w-4xl p-6 rounded-xl shadow-lg relative"
            >
              {/* Bouton ✏️ Annotation */}
              <button
                onClick={() => {
                  if (onAnnotate) onAnnotate();
                  else console.log("Annotation via modale");
                }}
                className="absolute top-3 right-10 text-gray-500 hover:text-blue-600 transition"
                title="Ajouter une annotation"
              >
                <Pencil className="w-5 h-5" />
              </button>

              {/* Bouton ❌ Fermeture */}
              <button
                onClick={onClose}
                className="absolute top-3 right-3 text-gray-500 hover:text-red-500 transition"
                title="Fermer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Titre */}
              {title && (
                <Dialog.Title className="text-lg font-semibold text-gray-800 mb-4">
                  {title}
                </Dialog.Title>
              )}

              {/* Contenu graphique */}
              <div>{children}</div>
            </Dialog.Panel>
          </div>
        </Dialog>
      )}
    </AnimatePresence>
  );
}
