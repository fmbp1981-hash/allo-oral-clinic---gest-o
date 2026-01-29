import React, { useEffect, useState } from 'react';
import {
  getTrelloBoards,
  getTrelloLists,
  getTrelloCards,
  createTrelloCard,
  updateTrelloCard,
  deleteTrelloCard
} from '../services/trelloService';

export default function TrelloDashboard() {
  const [boards, setBoards] = useState([]);
  const [selectedBoard, setSelectedBoard] = useState(null);
  const [lists, setLists] = useState([]);
  const [selectedList, setSelectedList] = useState(null);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCardForm, setShowCardForm] = useState(false);
  const [cardForm, setCardForm] = useState({ name: '', desc: '' });
  const [editingCard, setEditingCard] = useState(null);
  const [cardActionLoading, setCardActionLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getTrelloBoards().then(data => {
      setBoards(data);
      setLoading(false);
    });
  }, []);

  const handleBoardSelect = async (boardId) => {
    setSelectedBoard(boardId);
    setLoading(true);
    const lists = await getTrelloLists(boardId);
    setLists(lists);
    setSelectedList(null);
    setCards([]);
    setLoading(false);
  };

  const handleListSelect = async (listId) => {
    setSelectedList(listId);
    setLoading(true);
    const cards = await getTrelloCards({ listId });
    setCards(cards);
    setLoading(false);
  };

  // Card CRUD handlers
  const handleOpenCreateCard = () => {
    setEditingCard(null);
    setCardForm({ name: '', desc: '' });
    setShowCardForm(true);
  };

  const handleEditCard = (card) => {
    setEditingCard(card);
    setCardForm({ name: card.name, desc: card.desc });
    setShowCardForm(true);
  };

  const handleDeleteCard = async (cardId) => {
    if (!window.confirm('Tem certeza que deseja excluir este card?')) return;
    setCardActionLoading(true);
    await deleteTrelloCard(cardId);
    setCards(cards.filter(c => c.id !== cardId));
    setCardActionLoading(false);
  };

  const handleCardFormSubmit = async (e) => {
    e.preventDefault();
    setCardActionLoading(true);
    try {
      if (editingCard) {
        const updated = await updateTrelloCard(editingCard.id, { name: cardForm.name, desc: cardForm.desc });
        setCards(cards.map(c => (c.id === updated.id ? updated : c)));
      } else {
        const created = await createTrelloCard({ name: cardForm.name, desc: cardForm.desc, listId: selectedList });
        setCards([created, ...cards]);
      }
      setShowCardForm(false);
      setEditingCard(null);
      setCardForm({ name: '', desc: '' });
    } catch (err) {
      alert('Erro ao salvar card');
    }
    setCardActionLoading(false);
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Integração Trello</h2>
      {loading && <div>Carregando...</div>}
      <div className="mb-4">
        <label className="block mb-2">Boards:</label>
        <select onChange={e => handleBoardSelect(e.target.value)} value={selectedBoard || ''}>
          <option value="">Selecione um board</option>
          {boards.map(board => (
            <option key={board.id} value={board.id}>{board.name}</option>
          ))}
        </select>
      </div>
      {lists.length > 0 && (
        <div className="mb-4">
          <label className="block mb-2">Listas:</label>
          <select onChange={e => handleListSelect(e.target.value)} value={selectedList || ''}>
            <option value="">Selecione uma lista</option>
            {lists.map(list => (
              <option key={list.id} value={list.id}>{list.name}</option>
            ))}
          </select>
        </div>
      )}
      {selectedList && (
        <div className="mb-4">
          <button className="bg-green-600 text-white px-4 py-2 rounded" onClick={handleOpenCreateCard} disabled={cardActionLoading}>
            Novo Card
          </button>
        </div>
      )}
      {showCardForm && (
        <form className="mb-4 p-4 border rounded bg-gray-50" onSubmit={handleCardFormSubmit}>
          <h4 className="font-semibold mb-2">{editingCard ? 'Editar Card' : 'Novo Card'}</h4>
          <div className="mb-2">
            <label className="block mb-1">Título</label>
            <input className="w-full border rounded px-2 py-1" value={cardForm.name} onChange={e => setCardForm({ ...cardForm, name: e.target.value })} required />
          </div>
          <div className="mb-2">
            <label className="block mb-1">Descrição</label>
            <textarea className="w-full border rounded px-2 py-1" value={cardForm.desc} onChange={e => setCardForm({ ...cardForm, desc: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded" disabled={cardActionLoading}>
              {editingCard ? 'Salvar' : 'Criar'}
            </button>
            <button type="button" className="bg-gray-300 px-4 py-2 rounded" onClick={() => setShowCardForm(false)} disabled={cardActionLoading}>
              Cancelar
            </button>
          </div>
        </form>
      )}
      {cards.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold mb-2">Cards</h3>
          <ul className="space-y-2">
            {cards.map(card => (
              <li key={card.id} className="border p-2 rounded flex justify-between items-center">
                <div>
                  <div className="font-bold">{card.name}</div>
                  <div>{card.desc}</div>
                  <div className="text-xs text-gray-500">{card.url}</div>
                </div>
                <div className="flex gap-2">
                  <button className="text-blue-600" onClick={() => handleEditCard(card)} disabled={cardActionLoading}>Editar</button>
                  <button className="text-red-600" onClick={() => handleDeleteCard(card.id)} disabled={cardActionLoading}>Excluir</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
