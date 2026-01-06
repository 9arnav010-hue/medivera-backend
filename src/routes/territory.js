// backend/src/routes/territory.js
import express from 'express';
import * as territoryController from '../controllers/territoryController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Create territory from run
router.post('/', protect, territoryController.createTerritory);

// Get user territories
router.get('/user/:userId?', protect, territoryController.getUserTerritories);

// Get territories in area (for map)
router.get('/area', protect, territoryController.getTerritoriesInArea);

// Get territory details
router.get('/:territoryId', protect, territoryController.getTerritoryDetails);

// Upgrade territory
router.post('/:territoryId/upgrade', protect, territoryController.upgradeTerritory);

// Defend territory
router.post('/:territoryId/defend', protect, territoryController.defendTerritory);

// Delete territory
router.delete('/:territoryId', protect, territoryController.deleteTerritory);

export default router;