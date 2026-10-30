// CommentButton.jsx
"use client";

import { useState, useEffect, useRef } from "react";
import { FaPencilAlt } from "react-icons/fa";

export default function CommentButton({ 
  containerRef, 
  hideButton = false, 
  comments = [], // Renommé de annotations à comments pour plus de clarté
  onAddComment = () => {}, 
  onUpdateComment = () => {}, 
  onDeleteComment = () => {} 
}) {
  const [showCommentPopup, setShowCommentPopup] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentColor, setCommentColor] = useState("");
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [editingColor, setEditingColor] = useState("");

  const commentPopupRef = useRef(null);

  // Gérer les clics à l'extérieur du popup
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        showCommentPopup &&
        commentPopupRef.current &&
        !commentPopupRef.current.contains(event.target) &&
        !event.target.closest('[data-comment-toggle="true"]')
      ) {
        setShowCommentPopup(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showCommentPopup]);

  // Ajouter un commentaire
  const handleAddComment = (e) => {
    e.preventDefault();
    if (!commentText || !commentColor) return;
    
    // Créer un nouveau commentaire avec des coordonnées par défaut
    const newComment = {
      id: Date.now(),
      text: commentText,
      color: commentColor,
      xPercent: 50,
      yPercent: 50
    };
    
    onAddComment(newComment);
    
    setCommentText("");
    setCommentColor("");
    setShowCommentPopup(false);
  };

  // Calculer la position en pixels à partir des pourcentages
  const calculatePosition = (comment) => {
    if (!containerRef?.current) return { x: 0, y: 0 };
    
    const bounds = containerRef.current.getBoundingClientRect();
    const x = (bounds.width * comment.xPercent / 100) - 80;
    const y = (bounds.height * comment.yPercent / 100) - 40;
    
    return { x, y };
  };

  return (
    <>
      {!hideButton && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowCommentPopup(true);
          }}
          className="bg-gray-300 p-2 rounded-full hover:bg-gray-400 transition"
          data-comment-toggle="true"
        >
          <FaPencilAlt size={18} className="text-gray-600" />
        </button>
      )}

      {showCommentPopup && (
        <div
          ref={commentPopupRef}
          className="absolute right-0 top-full mt-2 bg-white shadow-lg rounded-md p-4 w-64 z-50"
        >
          <h4 className="font-semibold text-gray-500 mb-2">Ajouter un commentaire</h4>
          <form onSubmit={handleAddComment}>
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Votre commentaire ici..."
              className="w-full border rounded p-2 text-sm mb-2"
              rows={3}
            />
            <div className="flex gap-2 mb-3 justify-center">
              <p className="text-sm text-gray-500 mr-2">Couleur :</p>
              {["#22c55e", "#eab308", "#ef4444"].map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setCommentColor(color)}
                  className={`w-6 h-6 rounded-full border-2 ${
                    commentColor === color ? "border-black" : "border-transparent"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <button
              type="submit"
              className="bg-blue-500 text-white rounded py-1 px-3 w-full hover:bg-blue-600"
            >
              Ajouter
            </button>
          </form>
        </div>
      )}

      {/* Rendu des commentaires */}
      {Array.isArray(comments) && comments.map((comment) => {
        const isEditing = editingCommentId === comment.id;
        const position = calculatePosition(comment);
        
        // Fonction pour déplacer le commentaire
        const handleMouseDown = (e) => {
          if (isEditing) return;
          
          e.preventDefault();
          const startX = e.clientX;
          const startY = e.clientY;
          const initialX = position.x;
          const initialY = position.y;
          
          const handleMouseMove = (moveEvent) => {
            if (!containerRef?.current) return;
            
            const bounds = containerRef.current.getBoundingClientRect();
            const dx = moveEvent.clientX - startX;
            const dy = moveEvent.clientY - startY;
            
            const newX = Math.min(Math.max(0, initialX + dx), bounds.width - 160);
            const newY = Math.min(Math.max(0, initialY + dy), bounds.height - 80);
            
            const newXPercent = (newX + 80) / bounds.width * 100;
            const newYPercent = (newY + 40) / bounds.height * 100;
            
            onUpdateComment({
              ...comment,
              xPercent: newXPercent,
              yPercent: newYPercent
            });
          };
          
          const handleMouseUp = () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
          };
          
          document.addEventListener("mousemove", handleMouseMove);
          document.addEventListener("mouseup", handleMouseUp);
        };
        
        return (
          <div
            key={comment.id}
            className="absolute p-2 rounded-lg shadow text-white text-sm z-40"
            style={{
              backgroundColor: comment.color,
              left: position.x,
              top: position.y,
              cursor: isEditing ? "default" : "move",
              maxWidth: "160px",
              wordWrap: "break-word"
            }}
            onMouseDown={handleMouseDown}
            onDoubleClick={() => {
              setEditingCommentId(comment.id);
              setEditingText(comment.text);
              setEditingColor(comment.color);
            }}
          >
            {comment.text}
            
            {isEditing && (
              <div className="absolute top-full left-0 mt-2 bg-white text-black p-2 rounded shadow-xl z-50 w-64">
                <textarea
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  className="w-full border rounded p-2 text-sm mb-2"
                />
                <div className="flex gap-2 mb-2 justify-center">
                  {["#22c55e", "#eab308", "#ef4444"].map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setEditingColor(color)}
                      className={`w-6 h-6 rounded-full border-2 ${
                        editingColor === color ? "border-black" : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      onUpdateComment({
                        ...comment,
                        text: editingText,
                        color: editingColor
                      });
                      setEditingCommentId(null);
                    }}
                    className="text-white bg-blue-500 px-3 py-1 rounded"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => {
                      onDeleteComment(comment.id);
                      setEditingCommentId(null);
                    }}
                    className="text-white bg-red-500 px-3 py-1 rounded"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}