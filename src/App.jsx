import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const TaskManagementPetriNet = () => {
  const [tasks, setTasks] = useState([]);
  const [newTaskName, setNewTaskName] = useState('');
  const [tokens, setTokens] = useState([]);
  const [nextTokenId, setNextTokenId] = useState(1);
  const animationRef = useRef();

  // Configuration du réseau de Petri adapté à la gestion des tâches
  const places = {
    BACKLOG: { id: 'BACKLOG', x: 100, y: 200, name: 'Backlog', color: 'bg-red-500', hasInitialToken: true },
    READY: { id: 'READY', x: 250, y: 120, name: 'Prête', color: 'bg-blue-400', hasInitialToken: false },
    IN_PROGRESS: { id: 'IN_PROGRESS', x: 250, y: 280, name: 'En cours', color: 'bg-green-400', hasInitialToken: false },
    REVIEW: { id: 'REVIEW', x: 400, y: 120, name: 'Révision', color: 'bg-purple-500', hasInitialToken: false },
    BLOCKED: { id: 'BLOCKED', x: 400, y: 280, name: 'Bloquée', color: 'bg-orange-500', hasInitialToken: false },
    DONE: { id: 'DONE', x: 550, y: 120, name: 'Terminée', color: 'bg-yellow-400', hasInitialToken: false },
    ARCHIVED: { id: 'ARCHIVED', x: 550, y: 280, name: 'Archivée', color: 'bg-pink-400', hasInitialToken: false },
    DELIVERED: { id: 'DELIVERED', x: 700, y: 200, name: 'Livrée', color: 'bg-indigo-500', hasInitialToken: false }
  };

  const transitions = [
    { id: 'PLAN', x: 175, y: 120, name: 'Planifier', inputs: ['BACKLOG'], outputs: ['READY'], condition: 'Préparer la tâche' },
    { id: 'START', x: 175, y: 200, name: 'Démarrer', inputs: ['READY'], outputs: ['IN_PROGRESS'], condition: 'Commencer le travail' },
    { id: 'PAUSE', x: 175, y: 280, name: 'Pauser', inputs: ['IN_PROGRESS'], outputs: ['BACKLOG'], condition: 'Mettre en attente' },
    { id: 'SUBMIT', x: 325, y: 150, name: 'Soumettre', inputs: ['IN_PROGRESS'], outputs: ['REVIEW'], condition: 'Soumettre pour relecture' },
    { id: 'REJECT', x: 325, y: 250, name: 'Rejeter', inputs: ['REVIEW'], outputs: ['IN_PROGRESS'], condition: 'Retour pour modifications' },
    { id: 'BLOCK', x: 325, y: 350, name: 'Bloquer', inputs: ['IN_PROGRESS'], outputs: ['BLOCKED'], condition: 'Marquer comme bloquée' },
    { id: 'UNBLOCK', x: 425, y: 350, name: 'Débloquer', inputs: ['BLOCKED'], outputs: ['IN_PROGRESS'], condition: 'Débloquer la tâche' },
    { id: 'APPROVE', x: 475, y: 120, name: 'Approuver', inputs: ['REVIEW'], outputs: ['DONE'], condition: 'Approuver comme terminée' },
    { id: 'ARCHIVE', x: 475, y: 200, name: 'Archiver', inputs: ['DONE'], outputs: ['ARCHIVED'], condition: 'Archivage final' },
    { id: 'DELIVER', x: 625, y: 200, name: 'Livrer', inputs: ['DONE', 'ARCHIVED'], outputs: ['DELIVERED'], condition: 'Livraison finale' }
  ];

  // Initialiser les jetons système
  useEffect(() => {
    const initialTokens = [];
    let tokenId = 1;
    
    Object.values(places).forEach(place => {
      if (place.hasInitialToken) {
        initialTokens.push({
          id: tokenId++,
          taskId: null,
          taskName: `Jeton système ${place.name}`,
          currentPlace: place.id,
          x: place.x,
          y: place.y,
          targetX: place.x,
          targetY: place.y,
          isAnimating: false,
          isSystemToken: true
        });
      }
    });
    
    setTokens(initialTokens);
    setNextTokenId(tokenId);
  }, []);

  // Ajouter une nouvelle tâche
  const addTask = () => {
    if (newTaskName.trim()) {
      const newTask = {
        id: Date.now(),
        name: newTaskName,
        status: 'BACKLOG',
        createdAt: new Date().toLocaleTimeString(),
        type: 'user'
      };
      setTasks(prev => [...prev, newTask]);
      
      // Créer un jeton pour cette tâche
      const newToken = {
        id: nextTokenId,
        taskId: newTask.id,
        taskName: newTask.name,
        currentPlace: 'BACKLOG',
        x: places.BACKLOG.x,
        y: places.BACKLOG.y,
        targetX: places.BACKLOG.x,
        targetY: places.BACKLOG.y,
        isAnimating: false,
        isSystemToken: false
      };
      setTokens(prev => [...prev, newToken]);
      setNextTokenId(prev => prev + 1);
      setNewTaskName('');
    }
  };

  // Vérifier si une transition peut être activée
  const canFireTransition = (transition) => {
    return transition.inputs.every(placeId => {
      return tokens.some(token => 
        token.currentPlace === placeId && !token.isAnimating
      );
    });
  };

  // Activer une transition
  const fireTransition = (transitionId) => {
    const transition = transitions.find(t => t.id === transitionId);
    if (!transition || !canFireTransition(transition)) return;

    // Trouver les jetons d'entrée
    const inputTokens = [];
    transition.inputs.forEach(placeId => {
      const token = tokens.find(t => 
        t.currentPlace === placeId && !t.isAnimating
      );
      if (token) inputTokens.push(token);
    });

    if (inputTokens.length !== transition.inputs.length) return;

    // Déplacer les jetons
    setTokens(prev => {
      let newTokens = [...prev];
      
      // Déplacer vers la première place de sortie
      transition.inputs.forEach((placeId, index) => {
        const tokenIndex = newTokens.findIndex(t => 
          t.currentPlace === placeId && !t.isAnimating
        );
        if (tokenIndex !== -1) {
          const targetPlace = places[transition.outputs[0]];
          newTokens[tokenIndex] = {
            ...newTokens[tokenIndex],
            targetX: targetPlace.x,
            targetY: targetPlace.y,
            isAnimating: true,
            currentPlace: transition.outputs[0]
          };
        }
      });

      // Créer des jetons supplémentaires si nécessaire
      if (transition.outputs.length > 1) {
        for (let i = 1; i < transition.outputs.length; i++) {
          const outputPlace = places[transition.outputs[i]];
          const sourceToken = inputTokens[0];
          newTokens.push({
            id: nextTokenId + i - 1,
            taskId: sourceToken.taskId,
            taskName: sourceToken.taskName,
            currentPlace: transition.outputs[i],
            x: outputPlace.x,
            y: outputPlace.y,
            targetX: outputPlace.x,
            targetY: outputPlace.y,
            isAnimating: false,
            isSystemToken: sourceToken.isSystemToken
          });
        }
      }

      return newTokens;
    });

    // Mettre à jour le statut des tâches utilisateur
    if (inputTokens.some(token => !token.isSystemToken)) {
      setTasks(prev => prev.map(task => {
        const relatedToken = inputTokens.find(token => token.taskId === task.id);
        if (relatedToken && transition.outputs.length > 0) {
          return { ...task, status: transition.outputs[0] };
        }
        return task;
      }));
    }

    setNextTokenId(prev => prev + (transition.outputs.length > 1 ? transition.outputs.length - 1 : 0));
  };

  // Animation des jetons
  useEffect(() => {
    const animate = () => {
      setTokens(prev => prev.map(token => {
        if (token.isAnimating) {
          const dx = token.targetX - token.x;
          const dy = token.targetY - token.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance > 2) {
            const speed = 0.08;
            return {
              ...token,
              x: token.x + dx * speed,
              y: token.y + dy * speed
            };
          } else {
            return {
              ...token,
              x: token.targetX,
              y: token.targetY,
              isAnimating: false
            };
          }
        }
        return token;
      }));
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Compter les jetons par place
  const getTokenCountByPlace = (placeId) => {
    return tokens.filter(token => token.currentPlace === placeId && !token.isAnimating).length;
  };

  // Filtrer les tâches utilisateur
  const userTasks = tasks.filter(task => task.type === 'user');

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
        Gestion de Tâches avec Réseau de Petri Complexe
      </h1>
      
      {/* Interface d'ajout de tâches */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8 max-w-md mx-auto">
        <h2 className="text-xl font-semibold mb-4">Ajouter une tâche</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={newTaskName}
            onChange={(e) => setNewTaskName(e.target.value)}
            placeholder="Nom de la tâche..."
            className="flex-1 p-2 border border-gray-300 rounded"
            onKeyPress={(e) => e.key === 'Enter' && addTask()}
          />
          <button
            onClick={addTask}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Ajouter
          </button>
        </div>
      </div>

      {/* Visualisation du réseau de Petri */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4 text-center">Flux de travail des tâches</h2>
        <div className="relative overflow-auto">
          <svg width="800" height="400" className="border border-gray-200 rounded">
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" 
                      refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#666" />
              </marker>
            </defs>
            
            {/* Arcs de connexion */}
            {transitions.map(transition => (
              <g key={transition.id}>
                {transition.inputs.map(inputPlace => (
                  <line
                    key={`${transition.id}-${inputPlace}`}
                    x1={places[inputPlace].x + 15}
                    y1={places[inputPlace].y}
                    x2={transition.x - 10}
                    y2={transition.y}
                    stroke="#666"
                    strokeWidth="2"
                    markerEnd="url(#arrowhead)"
                  />
                ))}
                {transition.outputs.map(outputPlace => (
                  <line
                    key={`${transition.id}-${outputPlace}`}
                    x1={transition.x + 10}
                    y1={transition.y}
                    x2={places[outputPlace].x - 15}
                    y2={places[outputPlace].y}
                    stroke="#666"
                    strokeWidth="2"
                    markerEnd="url(#arrowhead)"
                  />
                ))}
              </g>
            ))}

            {/* Places */}
            {Object.values(places).map(place => (
              <g key={place.id}>
                <circle
                  cx={place.x}
                  cy={place.y}
                  r="25"
                  fill="white"
                  stroke="#374151"
                  strokeWidth="3"
                />
                <text
                  x={place.x}
                  y={place.y - 35}
                  textAnchor="middle"
                  className="text-sm font-bold"
                  fill="#374151"
                >
                  {place.name}
                </text>
                <text
                  x={place.x}
                  y={place.y + 40}
                  textAnchor="middle"
                  className="text-xs"
                  fill="#6B7280"
                >
                  {getTokenCountByPlace(place.id)} {getTokenCountByPlace(place.id) <= 1 ? 'jeton' : 'jetons'}
                </text>
              </g>
            ))}

            {/* Transitions */}
            {transitions.map(transition => (
              <g key={transition.id}>
                <rect
                  x={transition.x - 10}
                  y={transition.y - 8}
                  width="20"
                  height="16"
                  fill={canFireTransition(transition) ? "#10B981" : "#374151"}
                  className="cursor-pointer"
                  onClick={() => fireTransition(transition.id)}
                />
                <text
                  x={transition.x}
                  y={transition.y - 15}
                  textAnchor="middle"
                  className="text-xs font-medium cursor-pointer"
                  fill="#374151"
                  onClick={() => fireTransition(transition.id)}
                >
                  {transition.name}
                </text>
              </g>
            ))}

            {/* Jetons */}
            {tokens.map(token => (
              <g key={token.id}>
                <circle
                  cx={token.x}
                  cy={token.y}
                  r="6"
                  fill={token.isSystemToken ? "#000000" : "#EF4444"}
                  stroke={token.isSystemToken ? "#374151" : "#DC2626"}
                  strokeWidth="2"
                  className="cursor-pointer"
                />
                {!token.isSystemToken && (
                  <text
                    x={token.x}
                    y={token.y + 2}
                    textAnchor="middle"
                    className="text-xs font-bold fill-white pointer-events-none"
                    style={{ fontSize: '8px' }}
                  >
                    {token.taskId.toString().slice(-2)}
                  </text>
                )}
              </g>
            ))}
          </svg>
        </div>
      </div>

      {/* Contrôles des transitions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {transitions.map(transition => (
          <div key={transition.id} className="bg-white p-4 rounded-lg shadow-md">
            <h3 className="font-semibold mb-2">{transition.name}</h3>
            <p className="text-sm text-gray-600 mb-2">{transition.condition}</p>
            <p className="text-xs text-gray-500 mb-3">
              De: {transition.inputs.map(i => places[i].name).join(', ')} → 
              Vers: {transition.outputs.map(o => places[o].name).join(', ')}
            </p>
            <button
              onClick={() => fireTransition(transition.id)}
              disabled={!canFireTransition(transition)}
              className={`w-full p-2 text-white text-sm rounded transition-colors ${
                canFireTransition(transition)
                  ? 'bg-green-500 hover:bg-green-600 cursor-pointer'
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              {canFireTransition(transition) ? 'Exécuter' : 'Non disponible'}
            </button>
          </div>
        ))}
      </div>

      {/* État du système */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">État des tâches</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.values(places).map(place => {
            const placeTokens = tokens.filter(t => t.currentPlace === place.id && !t.isAnimating);
            return (
              <div key={place.id} className="text-center">
                <div className={`w-16 h-16 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold ${place.color}`}>
                  {place.name}
                </div>
                <p className="text-sm font-medium">{placeTokens.length} {placeTokens.length <= 1 ? 'jeton' : 'jetons'}</p>
                <div className="mt-1 max-h-20 overflow-y-auto">
                  {placeTokens.map(token => (
                    <div 
                      key={token.id} 
                      className="text-xs text-gray-600 truncate px-1 py-0.5 hover:bg-gray-100 rounded"
                      title={token.isSystemToken ? 'Jeton système' : token.taskName}
                    >
                      {token.isSystemToken ? '● Système' : `● ${token.taskName}`}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Liste des tâches utilisateur */}
      {userTasks.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Tâches utilisateur</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Crée à</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {userTasks.map(task => (
                  <tr key={task.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{task.id.toString().slice(-4)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{task.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${places[task.status].color} text-white`}>
                        {places[task.status].name}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{task.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskManagementPetriNet;