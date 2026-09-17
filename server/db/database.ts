/**
 * Normalized Data Access Layer (DAL) & Relational Repository
 * Paimaxis Infra Intelligence System
 *
 * Designed with a repository abstraction so that in-memory/file storage
 * can be replaced by PostgreSQL, Cloud SQL, or Firestore without altering
 * backend service contracts or frontend API consumers.
 */

import {
  ProjectEntity,
  AgencyEntity,
  SectorEntity,
  LocationEntity,
  BudgetEntity,
  ExpenditureEntity,
  ProgressEntity,
  MilestoneEntity,
  RiskAssessmentEntity,
  PredictionEntity,
  AlertEntity,
  RecommendationEntity,
  ProjectUpdateEntity,
  UserEntity,
  AuditLogEntity,
  EnrichedProject,
  PaginationParams,
  PaginatedResult
} from '../models/types.ts';

import {
  SEED_AGENCIES,
  SEED_SECTORS,
  SEED_LOCATIONS,
  SEED_PROJECTS,
  SEED_BUDGETS,
  SEED_EXPENDITURES,
  SEED_PROGRESS,
  SEED_MILESTONES,
  SEED_RISK_ASSESSMENTS,
  SEED_PREDICTIONS,
  SEED_ALERTS,
  SEED_RECOMMENDATIONS,
  SEED_PROJECT_UPDATES,
  SEED_USERS,
  SEED_AUDIT_LOGS
} from './seedData.ts';

const PROTOTYPE_DISCLAIMER = "PROTOTYPE DEMONSTRATION MODE: Data model structured for direct MoSPI-IPMD/OCMS/PM GatiShakti API ingestion without UI refactoring.";

export class RelationalDatabase {
  private agencies: Map<string, AgencyEntity> = new Map();
  private sectors: Map<string, SectorEntity> = new Map();
  private locations: Map<string, LocationEntity> = new Map();
  private projects: Map<string, ProjectEntity> = new Map();
  private budgets: Map<string, BudgetEntity> = new Map(); // keyed by projectId
  private expenditures: Map<string, ExpenditureEntity> = new Map(); // keyed by projectId
  private progresses: Map<string, ProgressEntity> = new Map(); // keyed by projectId
  private milestones: Map<string, MilestoneEntity[]> = new Map(); // keyed by projectId
  private riskAssessments: Map<string, RiskAssessmentEntity> = new Map(); // keyed by projectId
  private predictions: Map<string, PredictionEntity> = new Map(); // keyed by projectId
  private alerts: Map<string, AlertEntity> = new Map(); // keyed by alert id
  private recommendations: Map<string, RecommendationEntity[]> = new Map(); // keyed by projectId
  private projectUpdates: Map<string, ProjectUpdateEntity[]> = new Map(); // keyed by projectId
  private users: Map<string, UserEntity> = new Map();
  private auditLogs: AuditLogEntity[] = [];

  constructor() {
    this.seed();
  }

  /**
   * Initialize and seed the relational repository
   */
  public seed(): void {
    SEED_AGENCIES.forEach(a => this.agencies.set(a.id, { ...a }));
    SEED_SECTORS.forEach(s => this.sectors.set(s.id, { ...s }));
    SEED_LOCATIONS.forEach(l => this.locations.set(l.id, { ...l }));
    SEED_PROJECTS.forEach(p => this.projects.set(p.id, { ...p }));

    SEED_BUDGETS.forEach(b => this.budgets.set(b.projectId, { ...b }));
    SEED_EXPENDITURES.forEach(e => this.expenditures.set(e.projectId, { ...e }));
    SEED_PROGRESS.forEach(pr => this.progresses.set(pr.projectId, { ...pr }));

    // Group milestones by project
    this.milestones.clear();
    SEED_MILESTONES.forEach(m => {
      const list = this.milestones.get(m.projectId) || [];
      list.push({ ...m });
      this.milestones.set(m.projectId, list);
    });

    SEED_RISK_ASSESSMENTS.forEach(r => this.riskAssessments.set(r.projectId, { ...r }));
    SEED_PREDICTIONS.forEach(p => this.predictions.set(p.projectId, { ...p }));

    SEED_ALERTS.forEach(a => this.alerts.set(a.id, { ...a }));

    // Group recommendations by project
    this.recommendations.clear();
    SEED_RECOMMENDATIONS.forEach(r => {
      const list = this.recommendations.get(r.projectId) || [];
      list.push({ ...r });
      this.recommendations.set(r.projectId, list);
    });

    // Group time-series project updates
    this.projectUpdates.clear();
    SEED_PROJECT_UPDATES.forEach(u => {
      const list = this.projectUpdates.get(u.projectId) || [];
      list.push({ ...u });
      this.projectUpdates.set(u.projectId, list);
    });

    SEED_USERS.forEach(u => this.users.set(u.id, { ...u }));
    this.auditLogs = [...SEED_AUDIT_LOGS];
  }

  /**
   * Helper: Enrich a normalized ProjectEntity with joined relational entities
   */
  public enrichProject(project: ProjectEntity): EnrichedProject {
    const sector = this.sectors.get(project.sectorId) || {
      id: project.sectorId,
      code: 'GEN',
      name: 'Roads & Highways',
      nodalMinistry: 'Government of India',
      priorityLevel: 'STRATEGIC',
      icon: 'Route',
      description: 'Infrastructure'
    };

    const agency = this.agencies.get(project.agencyId) || {
      id: project.agencyId,
      code: 'GOI',
      name: 'Central Implementing Agency',
      ministry: 'Nodal Ministry',
      contactEmail: 'contact@gov.in',
      headquarters: 'New Delhi',
      nodalSecretary: 'Nodal Secretary',
      website: 'https://india.gov.in'
    };

    const location = this.locations.get(project.locationId) || {
      id: project.locationId,
      state: 'National Corridor',
      districts: ['All Districts'],
      latitude: 20.5937,
      longitude: 78.9629,
      terrainType: 'PLAINS'
    };

    const budget = this.budgets.get(project.id) || {
      id: `bgt-${project.id}`,
      projectId: project.id,
      approvedCostCr: 10000,
      revisedCostCr: 10000,
      contingencyReserveCr: 500,
      sanctionedDate: project.startDate
    };

    const expenditure = this.expenditures.get(project.id) || {
      id: `exp-${project.id}`,
      projectId: project.id,
      currentExpenditureCr: 5000,
      committedExpenditureCr: 2000,
      fyQuarter: 'Q4-FY2026',
      lastPaymentDate: '2026-02-01',
      auditedBy: 'CAG of India',
      lastAuditedAt: '2025-12-31'
    };

    const progress = this.progresses.get(project.id) || {
      id: `prg-${project.id}`,
      projectId: project.id,
      physicalProgressPct: 50,
      plannedProgressPct: 50,
      financialProgressPct: 50,
      progressGapPct: 0,
      asOfDate: '2026-02-01',
      reportingOfficer: project.nodalOfficerName,
      verificationMethod: 'FIELD_AUDIT'
    };

    const risk = this.riskAssessments.get(project.id) || {
      id: `risk-${project.id}`,
      projectId: project.id,
      overallRiskScore: 50,
      costRiskScore: 50,
      scheduleRiskScore: 50,
      progressRiskScore: 50,
      milestoneRiskScore: 50,
      financialRiskScore: 50,
      riskLevel: 'MEDIUM',
      confidenceScorePct: 90,
      explainabilityFactors: [],
      assessedAt: new Date().toISOString()
    };

    const prediction = this.predictions.get(project.id) || {
      id: `pred-${project.id}`,
      projectId: project.id,
      predictedCompletionDate: project.revisedCompletionDate,
      predictedTimeDelayMonths: 0,
      timeDelayProbabilityPct: 20,
      predictedFinalCostCr: budget.revisedCostCr,
      predictedCostOverrunCr: 0,
      costOverrunProbabilityPct: 15,
      cpi: 1.0,
      spi: 1.0,
      pvCr: 5000,
      evCr: 5000,
      acCr: 5000,
      costVarianceCr: 0,
      scheduleVarianceCr: 0,
      modelVersion: 'Gati-EVM-v1',
      computedAt: new Date().toISOString()
    };

    const milestones = this.milestones.get(project.id) || [];
    const recommendations = this.recommendations.get(project.id) || [];
    const updates = (this.projectUpdates.get(project.id) || []).sort(
      (a, b) => new Date(a.periodDate).getTime() - new Date(b.periodDate).getTime()
    );
    const alerts = Array.from(this.alerts.values()).filter(a => a.projectId === project.id);

    // Map risk factors to bottlenecks structure for backward-compatible UI view rendering
    const bottlenecks = risk.explainabilityFactors.map((f, idx) => ({
      id: `btn-${project.id}-${idx}`,
      title: f.factor,
      category: f.category,
      severity: f.severity,
      daysPending: 60 + idx * 30,
      agencyResponsible: agency.name,
      impactOnScheduleMonths: Math.round(f.weightPct / 10),
      estimatedCostImpactCr: Math.round((prediction.predictedCostOverrunCr * f.weightPct) / 100),
      description: f.description,
      status: 'ACTIVE',
      dateReported: '2025-11-01'
    }));

    const budgetUtilizationPct = budget.approvedCostCr > 0
      ? Number(((expenditure.currentExpenditureCr / budget.approvedCostCr) * 100).toFixed(1))
      : 0;

    const remainingBudgetCr = Math.max(0, budget.revisedCostCr - expenditure.currentExpenditureCr);

    const sCurveData = [
      { quarter: 'Q1', plannedPhysicalPct: Math.round(progress.plannedProgressPct * 0.4), actualPhysicalPct: Math.round(progress.physicalProgressPct * 0.45), plannedExpenditureCr: Math.round(budget.revisedCostCr * 0.35), actualExpenditureCr: Math.round(expenditure.currentExpenditureCr * 0.4) },
      { quarter: 'Q2', plannedPhysicalPct: Math.round(progress.plannedProgressPct * 0.6), actualPhysicalPct: Math.round(progress.physicalProgressPct * 0.65), plannedExpenditureCr: Math.round(budget.revisedCostCr * 0.55), actualExpenditureCr: Math.round(expenditure.currentExpenditureCr * 0.6) },
      { quarter: 'Q3', plannedPhysicalPct: Math.round(progress.plannedProgressPct * 0.8), actualPhysicalPct: Math.round(progress.physicalProgressPct * 0.82), plannedExpenditureCr: Math.round(budget.revisedCostCr * 0.75), actualExpenditureCr: Math.round(expenditure.currentExpenditureCr * 0.8) },
      { quarter: 'Q4', plannedPhysicalPct: progress.plannedProgressPct, actualPhysicalPct: progress.physicalProgressPct, plannedExpenditureCr: budget.revisedCostCr, actualExpenditureCr: expenditure.currentExpenditureCr },
      { quarter: 'Forecast', plannedPhysicalPct: 100, actualPhysicalPct: progress.physicalProgressPct, plannedExpenditureCr: budget.revisedCostCr, actualExpenditureCr: prediction.predictedFinalCostCr }
    ];

    return {
      code: project.code,
      ocmsId: project.ocmsId,
      name: project.name,
      status: project.status,
      contractType: project.contractType,
      contractor: project.contractor,
      contractorName: project.contractor,
      lengthOrCapacity: project.lengthOrCapacity,
      description: project.description,
      startDate: project.startDate,
      originalPlannedCompletion: project.originalCompletionDate,
      originalCompletionDate: project.originalCompletionDate,
      revisedPlannedCompletion: project.revisedCompletionDate,
      revisedCompletionDate: project.revisedCompletionDate,
      predictedCompletionDate: prediction.predictedCompletionDate,
      currentCompletionEstimate: project.currentCompletionEstimate,

      sector: sector.name as any,
      sectorEntity: sector,
      sectorId: sector.id,
      implementingAgency: agency.code,
      agency: agency.name as any,
      agencyEntity: agency,
      agencyId: agency.id,
      ministry: agency.ministry,
      nodalMinistry: sector.nodalMinistry,
      location: {
        state: location.state,
        districts: location.districts,
        coordinates: [location.latitude, location.longitude] as [number, number],
        corridorName: location.corridorName
      },
      locationEntity: location,

      approvedBudgetCr: budget.approvedCostCr,
      revisedBudgetCr: budget.revisedCostCr,
      expenditureToDateCr: expenditure.currentExpenditureCr,
      remainingBudgetCr,
      budgetUtilizationPct,

      plannedProgressPct: progress.plannedProgressPct,
      actualProgressPct: progress.physicalProgressPct,
      financialProgressPct: progress.financialProgressPct,
      progressGapPct: progress.progressGapPct,

      predictedTimeDelayMonths: prediction.predictedTimeDelayMonths,
      timeDelayProbabilityPct: prediction.timeDelayProbabilityPct,
      scheduleDelayProbabilityPct: prediction.timeDelayProbabilityPct,
      predictedFinalCostCr: prediction.predictedFinalCostCr,
      predictedCostOverrunCr: prediction.predictedCostOverrunCr,
      costOverrunProbabilityPct: prediction.costOverrunProbabilityPct,
      pvCr: prediction.pvCr,
      evCr: prediction.evCr,
      acCr: prediction.acCr,
      cpi: prediction.cpi,
      spi: prediction.spi,
      costVarianceCr: prediction.costVarianceCr,
      scheduleVarianceCr: prediction.scheduleVarianceCr,

      overallRiskScore: risk.overallRiskScore,
      costRiskScore: risk.costRiskScore,
      scheduleRiskScore: risk.scheduleRiskScore,
      progressRiskScore: risk.progressRiskScore,
      milestoneRiskScore: risk.milestoneRiskScore,
      financialRiskScore: risk.financialRiskScore,
      riskLevel: risk.riskLevel,
      confidenceScorePct: risk.confidenceScorePct,
      riskExplainability: risk.explainabilityFactors,

      milestones,
      bottlenecks,
      recommendations,
      historicalProgress: updates,
      sCurveData,
      alerts,

      nodalOfficer: {
        name: project.nodalOfficerName,
        designation: project.nodalOfficerDesignation,
        email: project.nodalOfficerEmail,
        phone: project.nodalOfficerPhone
      }
    };
  }

  // =============================================================
  // 1. Projects Query APIs (with Filtering, Pagination, Search)
  // =============================================================
  public getProjects(params: PaginationParams = {}): PaginatedResult<EnrichedProject> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'name',
      sortOrder = 'asc',
      search,
      sectorId,
      agencyId,
      riskLevel,
      status
    } = params;

    let items = Array.from(this.projects.values()).map(p => this.enrichProject(p));

    // Sector filtering (by ID or name)
    if (sectorId && sectorId !== 'ALL') {
      items = items.filter(p => p.sector.id === sectorId || p.sector.name === sectorId);
    }

    // Agency filtering (by ID or code)
    if (agencyId && agencyId !== 'ALL') {
      items = items.filter(p => p.agency.id === agencyId || p.agency.code === agencyId);
    }

    // Risk Level filtering
    if (riskLevel && riskLevel !== 'ALL') {
      items = items.filter(p => p.riskLevel === riskLevel);
    }

    // Status filtering
    if (status && status !== 'ALL') {
      items = items.filter(p => p.status === status);
    }

    // Full-text search
    if (search && search.trim().length > 0) {
      const q = search.trim().toLowerCase();
      items = items.filter(p => 
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.contractor.toLowerCase().includes(q) ||
        p.agency.name.toLowerCase().includes(q) ||
        p.agency.code.toLowerCase().includes(q) ||
        p.location.state.toLowerCase().includes(q) ||
        (p.location.corridorName && p.location.corridorName.toLowerCase().includes(q))
      );
    }

    // Sorting
    items.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'progress':
        case 'actualProgressPct':
          comparison = a.actualProgressPct - b.actualProgressPct;
          break;
        case 'budget':
        case 'approvedBudgetCr':
          comparison = a.approvedBudgetCr - b.approvedBudgetCr;
          break;
        case 'delay':
        case 'predictedTimeDelayMonths':
          comparison = a.predictedTimeDelayMonths - b.predictedTimeDelayMonths;
          break;
        case 'costOverrun':
        case 'predictedCostOverrunCr':
          comparison = a.predictedCostOverrunCr - b.predictedCostOverrunCr;
          break;
        case 'risk':
        case 'overallRiskScore':
          comparison = a.overallRiskScore - b.overallRiskScore;
          break;
        case 'cpi':
          comparison = a.cpi - b.cpi;
          break;
        case 'spi':
          comparison = a.spi - b.spi;
          break;
        case 'name':
        default:
          comparison = a.name.localeCompare(b.name);
          break;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const startIndex = (safePage - 1) * limit;
    const paginatedItems = items.slice(startIndex, startIndex + limit);

    return {
      data: paginatedItems,
      pagination: {
        page: safePage,
        limit,
        total,
        totalPages,
        hasNextPage: safePage < totalPages,
        hasPrevPage: safePage > 1
      },
      dataProvenance: "REPORTED_AND_CALCULATED",
      disclaimer: PROTOTYPE_DISCLAIMER
    };
  }

  public getProjectById(idOrCode: string): EnrichedProject | null {
    const cleanQuery = idOrCode.trim().toLowerCase().replace(/^project\s*/i, '');
    let project = this.projects.get(idOrCode);
    if (!project) {
      // Find by id, code, ocmsId, or partial match
      project = Array.from(this.projects.values()).find(p => 
        p.id.toLowerCase() === cleanQuery ||
        p.code.toLowerCase() === cleanQuery ||
        (p.ocmsId && p.ocmsId.toLowerCase() === cleanQuery) ||
        p.code.toLowerCase().includes(cleanQuery) ||
        p.name.toLowerCase().includes(cleanQuery)
      );
    }
    if (!project) return null;
    return this.enrichProject(project);
  }

  // =============================================================
  // 2. Specialized Risk & Anomaly Query APIs
  // =============================================================
  public getHighRiskProjects(): EnrichedProject[] {
    return Array.from(this.projects.values())
      .map(p => this.enrichProject(p))
      .filter(p => p.riskLevel === 'CRITICAL' || p.riskLevel === 'HIGH' || p.overallRiskScore >= 65)
      .sort((a, b) => b.overallRiskScore - a.overallRiskScore);
  }

  public getDelayedProjects(): EnrichedProject[] {
    return Array.from(this.projects.values())
      .map(p => this.enrichProject(p))
      .filter(p => p.predictedTimeDelayMonths > 0 || p.progressGapPct > 5)
      .sort((a, b) => b.predictedTimeDelayMonths - a.predictedTimeDelayMonths);
  }

  public getCostRiskProjects(): EnrichedProject[] {
    return Array.from(this.projects.values())
      .map(p => this.enrichProject(p))
      .filter(p => p.predictedCostOverrunCr > 0 || p.cpi < 1.0)
      .sort((a, b) => b.predictedCostOverrunCr - a.predictedCostOverrunCr);
  }

  // =============================================================
  // 3. Analytics Endpoints
  // =============================================================
  public getSectorAnalytics() {
    const all = Array.from(this.projects.values()).map(p => this.enrichProject(p));
    const sectors = Array.from(this.sectors.values());

    return sectors.map(sec => {
      const sectorProjects = all.filter(p => p.sector.id === sec.id || p.sector.name === sec.name);
      const totalBudgetCr = sectorProjects.reduce((s, p) => s + p.revisedBudgetCr, 0);
      const totalExpCr = sectorProjects.reduce((s, p) => s + p.expenditureToDateCr, 0);
      const totalOverrunCr = sectorProjects.reduce((s, p) => s + p.predictedCostOverrunCr, 0);
      const avgDelayMonths = sectorProjects.length > 0 
        ? Number((sectorProjects.reduce((s, p) => s + p.predictedTimeDelayMonths, 0) / sectorProjects.length).toFixed(1))
        : 0;
      const avgPhysicalPct = sectorProjects.length > 0
        ? Number((sectorProjects.reduce((s, p) => s + p.actualProgressPct, 0) / sectorProjects.length).toFixed(1))
        : 0;
      const criticalCount = sectorProjects.filter(p => p.riskLevel === 'CRITICAL').length;
      const highRiskCount = sectorProjects.filter(p => p.riskLevel === 'HIGH').length;

      return {
        sectorId: sec.id,
        sectorCode: sec.code,
        sectorName: sec.name,
        nodalMinistry: sec.nodalMinistry,
        projectCount: sectorProjects.length,
        totalBudgetCr,
        totalExpCr,
        totalOverrunCr,
        avgDelayMonths,
        avgPhysicalPct,
        criticalCount,
        highRiskCount
      };
    });
  }

  public getAgencyAnalytics() {
    const all = Array.from(this.projects.values()).map(p => this.enrichProject(p));
    const agencies = Array.from(this.agencies.values());

    return agencies.map(ag => {
      const agencyProjects = all.filter(p => p.agency.id === ag.id || p.agency.code === ag.code);
      const totalBudgetCr = agencyProjects.reduce((s, p) => s + p.revisedBudgetCr, 0);
      const totalExpCr = agencyProjects.reduce((s, p) => s + p.expenditureToDateCr, 0);
      const avgProgress = agencyProjects.length > 0
        ? Number((agencyProjects.reduce((s, p) => s + p.actualProgressPct, 0) / agencyProjects.length).toFixed(1))
        : 0;
      const delayedCount = agencyProjects.filter(p => p.predictedTimeDelayMonths > 0).length;
      const criticalCount = agencyProjects.filter(p => p.riskLevel === 'CRITICAL').length;
      const avgCpi = agencyProjects.length > 0
        ? Number((agencyProjects.reduce((s, p) => s + p.cpi, 0) / agencyProjects.length).toFixed(2))
        : 1.0;
      const avgSpi = agencyProjects.length > 0
        ? Number((agencyProjects.reduce((s, p) => s + p.spi, 0) / agencyProjects.length).toFixed(2))
        : 1.0;

      return {
        agencyId: ag.id,
        agencyCode: ag.code,
        agencyName: ag.name,
        ministry: ag.ministry,
        projectCount: agencyProjects.length,
        totalBudgetCr,
        totalExpCr,
        avgProgress,
        delayedCount,
        criticalCount,
        avgCpi,
        avgSpi
      };
    });
  }

  /**
   * Time-series trend analytics across projects or for a specific project
   * Shows progression: e.g. January -> 20%, February -> 28%, March -> 35%, April -> 41%
   */
  public getProjectTrends(projectId?: string) {
    if (projectId) {
      const updates = (this.projectUpdates.get(projectId) || []).sort(
        (a, b) => new Date(a.periodDate).getTime() - new Date(b.periodDate).getTime()
      );
      const project = this.projects.get(projectId);
      return {
        projectId,
        projectName: project ? project.name : '',
        trends: updates.map(u => ({
          periodDate: u.periodDate,
          periodName: u.periodName,
          physicalProgressPct: u.physicalProgressPct,
          plannedPhysicalProgressPct: u.plannedPhysicalProgressPct,
          financialProgressPct: u.financialProgressPct,
          expenditureCr: u.expenditureCr,
          plannedExpenditureCr: u.plannedExpenditureCr,
          earnedValueCr: u.earnedValueCr,
          delaysReportedDays: u.delaysReportedDays,
          remarks: u.remarks
        }))
      };
    }

    // Aggregate portfolio trend across all projects by period
    const allUpdates = Array.from(this.projectUpdates.values()).flat();
    const periodMap = new Map<string, {
      periodDate: string;
      periodName: string;
      totalActualProgress: number;
      totalPlannedProgress: number;
      totalExpenditure: number;
      totalPlannedExpenditure: number;
      totalEarnedValue: number;
      count: number;
    }>();

    allUpdates.forEach(u => {
      const existing = periodMap.get(u.periodDate) || {
        periodDate: u.periodDate,
        periodName: u.periodName,
        totalActualProgress: 0,
        totalPlannedProgress: 0,
        totalExpenditure: 0,
        totalPlannedExpenditure: 0,
        totalEarnedValue: 0,
        count: 0
      };

      existing.totalActualProgress += u.physicalProgressPct;
      existing.totalPlannedProgress += u.plannedPhysicalProgressPct;
      existing.totalExpenditure += u.expenditureCr;
      existing.totalPlannedExpenditure += u.plannedExpenditureCr;
      existing.totalEarnedValue += u.earnedValueCr;
      existing.count += 1;
      periodMap.set(u.periodDate, existing);
    });

    const portfolioTrends = Array.from(periodMap.values())
      .sort((a, b) => new Date(a.periodDate).getTime() - new Date(b.periodDate).getTime())
      .map(p => ({
        periodDate: p.periodDate,
        periodName: p.periodName,
        avgPhysicalProgressPct: Number((p.totalActualProgress / p.count).toFixed(1)),
        avgPlannedProgressPct: Number((p.totalPlannedProgress / p.count).toFixed(1)),
        totalExpenditureCr: Math.round(p.totalExpenditure),
        totalPlannedExpenditureCr: Math.round(p.totalPlannedExpenditure),
        totalEarnedValueCr: Math.round(p.totalEarnedValue)
      }));

    return {
      portfolioTrends,
      dataProvenance: "REPORTED_HISTORICAL_TIME_SERIES",
      disclaimer: PROTOTYPE_DISCLAIMER
    };
  }

  // =============================================================
  // 4. Alerts & PMO Escalation
  // =============================================================
  public getAlerts(filterSeverity?: string, filterStatus?: string): AlertEntity[] {
    let list = Array.from(this.alerts.values());
    if (filterSeverity && filterSeverity !== 'ALL') {
      list = list.filter(a => a.severity === filterSeverity);
    }
    if (filterStatus && filterStatus !== 'ALL') {
      list = list.filter(a => a.status === filterStatus);
    }
    return list.sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime());
  }

  public updateAlertStatus(
    alertId: string, 
    status: AlertEntity['status'], 
    remarks: string, 
    user = { name: 'Officer', role: 'Reviewer' }
  ): AlertEntity | null {
    const alert = this.alerts.get(alertId);
    if (!alert) return null;

    alert.status = status;
    alert.resolutionRemarks = remarks;
    if (status === 'RESOLVED') {
      alert.resolvedAt = new Date().toISOString();
    }

    // Add Audit Log
    this.createAuditLog({
      entityName: 'Alert',
      entityId: alert.id,
      action: status === 'ESCALATED_TO_PMO' ? 'ESCALATE' : 'STATUS_CHANGE',
      performedBy: user.name,
      userRole: user.role,
      details: `Alert ${alert.id} status updated to ${status}. Remarks: ${remarks}`
    });

    return alert;
  }

  // =============================================================
  // 5. Time-Series Ingestion & Project Updates API
  // =============================================================
  public recordProjectUpdate(
    projectId: string,
    update: Omit<ProjectUpdateEntity, 'id' | 'projectId' | 'recordedAt'>,
    user = { name: 'Nodal Officer', role: 'Data Reporter' }
  ): ProjectUpdateEntity | null {
    const project = this.projects.get(projectId);
    if (!project) return null;

    const newUpdate: ProjectUpdateEntity = {
      ...update,
      id: `upd-${projectId}-${Date.now()}`,
      projectId,
      recordedAt: new Date().toISOString()
    };

    const updates = this.projectUpdates.get(projectId) || [];
    updates.push(newUpdate);
    this.projectUpdates.set(projectId, updates);

    // Synchronize latest progress and expenditure into current entities
    const progress = this.progresses.get(projectId);
    if (progress) {
      progress.physicalProgressPct = update.physicalProgressPct;
      progress.plannedProgressPct = update.plannedPhysicalProgressPct;
      progress.progressGapPct = Number((update.plannedPhysicalProgressPct - update.physicalProgressPct).toFixed(1));
      progress.asOfDate = update.periodDate;
    }

    const expenditure = this.expenditures.get(projectId);
    if (expenditure) {
      expenditure.currentExpenditureCr = update.expenditureCr;
      expenditure.lastPaymentDate = update.periodDate;
    }

    // Recalculate EVM prediction indices
    const prediction = this.predictions.get(projectId);
    if (prediction && expenditure && update.plannedExpenditureCr > 0) {
      prediction.evCr = update.earnedValueCr;
      prediction.acCr = update.expenditureCr;
      prediction.pvCr = update.plannedExpenditureCr;
      prediction.cpi = expenditure.currentExpenditureCr > 0
        ? Number((prediction.evCr / prediction.acCr).toFixed(2))
        : 1.0;
      prediction.spi = prediction.pvCr > 0
        ? Number((prediction.evCr / prediction.pvCr).toFixed(2))
        : 1.0;
      prediction.costVarianceCr = prediction.evCr - prediction.acCr;
      prediction.scheduleVarianceCr = prediction.evCr - prediction.pvCr;
    }

    // Record Audit Log
    this.createAuditLog({
      entityName: 'ProjectUpdate',
      entityId: newUpdate.id,
      action: 'TIME_SERIES_RECORDED',
      performedBy: user.name,
      userRole: user.role,
      details: `New time-series progress update registered for ${project.name} (${update.periodName}): Physical ${update.physicalProgressPct}%, Exp ₹${update.expenditureCr} Cr.`
    });

    return newUpdate;
  }

  // =============================================================
  // 6. Portfolio Dashboard Macro Summary
  // =============================================================
  public getDashboardSummary() {
    const enriched = Array.from(this.projects.values()).map(p => this.enrichProject(p));

    const totalSanctionedBudgetCr = enriched.reduce((s, p) => s + p.approvedBudgetCr, 0);
    const totalRevisedBudgetCr = enriched.reduce((s, p) => s + p.revisedBudgetCr, 0);
    const cumulativeExpenditureCr = enriched.reduce((s, p) => s + p.expenditureToDateCr, 0);
    const totalForecastCostOverrunCr = enriched.reduce((s, p) => s + p.predictedCostOverrunCr, 0);
    const totalEacCr = enriched.reduce((s, p) => s + p.predictedFinalCostCr, 0);

    const delayedCount = enriched.filter(p => p.predictedTimeDelayMonths > 0).length;
    const criticalDelayCount = enriched.filter(p => p.predictedTimeDelayMonths >= 12).length;
    const criticalRiskCount = enriched.filter(p => p.riskLevel === 'CRITICAL').length;
    const highRiskCount = enriched.filter(p => p.riskLevel === 'HIGH').length;

    const avgPhysicalProgress = enriched.length > 0
      ? Number((enriched.reduce((s, p) => s + p.actualProgressPct, 0) / enriched.length).toFixed(1))
      : 0;

    const avgFinancialProgress = enriched.length > 0
      ? Number((enriched.reduce((s, p) => s + p.budgetUtilizationPct, 0) / enriched.length).toFixed(1))
      : 0;

    const avgCpi = enriched.length > 0
      ? Number((enriched.reduce((s, p) => s + p.cpi, 0) / enriched.length).toFixed(2))
      : 1.0;

    const avgSpi = enriched.length > 0
      ? Number((enriched.reduce((s, p) => s + p.spi, 0) / enriched.length).toFixed(2))
      : 1.0;

    const activeAlerts = Array.from(this.alerts.values()).filter(a => a.status !== 'RESOLVED');

    return {
      totalProjects: enriched.length,
      totalSanctionedBudgetCr,
      totalRevisedBudgetCr,
      cumulativeExpenditureCr,
      totalForecastCostOverrunCr,
      totalEacCr,
      delayedProjectsCount: delayedCount,
      criticalDelayProjectsCount: criticalDelayCount,
      criticalRiskCount,
      highRiskCount,
      avgPhysicalProgressPct: avgPhysicalProgress,
      avgFinancialProgressPct: avgFinancialProgress,
      portfolioCpi: avgCpi,
      portfolioSpi: avgSpi,
      activeAlertsCount: activeAlerts.length,
      criticalAlertsCount: activeAlerts.filter(a => a.severity === 'CRITICAL').length,
      dataProvenance: "AGGREGATED_PORTFOLIO_KPI",
      disclaimer: PROTOTYPE_DISCLAIMER
    };
  }

  // =============================================================
  // 7. Audit Logging & Users
  // =============================================================
  public createAuditLog(entry: Omit<AuditLogEntity, 'id' | 'timestamp'>): AuditLogEntity {
    const log: AuditLogEntity = {
      ...entry,
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString()
    };
    this.auditLogs.unshift(log);
    // Keep max 500 logs
    if (this.auditLogs.length > 500) {
      this.auditLogs.pop();
    }
    return log;
  }

  public getAuditLogs(limit = 50): AuditLogEntity[] {
    return this.auditLogs.slice(0, limit);
  }

  public getUsers(): UserEntity[] {
    return Array.from(this.users.values());
  }

  public getSectors(): SectorEntity[] {
    return Array.from(this.sectors.values());
  }

  public getAgencies(): AgencyEntity[] {
    return Array.from(this.agencies.values());
  }

  public getRawProjects(): ProjectEntity[] {
    return Array.from(this.projects.values());
  }

  /**
   * Apply official update extracted from MoSPI/IPMD or PAIMANA
   */
  public applyOfficialRecordUpdate(projectId: string, record: any): void {
    const project = this.projects.get(projectId);
    if (!project) return;

    // Update project metadata
    if (record.name) project.name = record.name;
    if (record.revisedCompletionDate) project.revisedCompletionDate = record.revisedCompletionDate;
    if (record.contractor) project.contractor = record.contractor;
    if (record.lengthOrCapacity) project.lengthOrCapacity = record.lengthOrCapacity;

    // Update Budget
    const budget = this.budgets.get(projectId);
    if (budget) {
      if (record.approvedCostCr) budget.approvedCostCr = record.approvedCostCr;
      if (record.revisedCostCr) budget.revisedCostCr = record.revisedCostCr;
    }

    // Update Expenditure
    const expenditure = this.expenditures.get(projectId);
    if (expenditure && record.cumulativeExpenditureCr !== undefined) {
      expenditure.currentExpenditureCr = record.cumulativeExpenditureCr;
      expenditure.lastPaymentDate = new Date().toISOString().slice(0, 10);
    }

    // Update Progress
    const progress = this.progresses.get(projectId);
    if (progress) {
      if (record.actualPhysicalProgressPct !== undefined) progress.physicalProgressPct = record.actualPhysicalProgressPct;
      if (record.plannedPhysicalProgressPct !== undefined) progress.plannedProgressPct = record.plannedPhysicalProgressPct;
      progress.progressGapPct = Number((progress.plannedProgressPct - progress.physicalProgressPct).toFixed(1));
      progress.asOfDate = new Date().toISOString().slice(0, 10);
    }

    // Update Milestones if provided
    if (record.milestones && Array.isArray(record.milestones) && record.milestones.length > 0) {
      const msList: MilestoneEntity[] = record.milestones.map((m: any, idx: number) => ({
        id: `ms-${projectId}-${idx + 1}`,
        projectId,
        name: m.name,
        category: m.category || 'CIVIL_WORKS',
        weightagePct: m.weightagePct || 20,
        originalTargetDate: m.originalTargetDate || '2025-12-31',
        revisedTargetDate: m.revisedTargetDate,
        actualCompletionDate: m.actualCompletionDate,
        status: m.status || 'ON_TRACK',
        isCriticalPath: m.isCriticalPath ?? true,
        delayDays: m.delayDays || 0,
        remarks: m.remarks
      }));
      this.milestones.set(projectId, msList);
    }

    // Recalculate Prediction and EVM
    const prediction = this.predictions.get(projectId);
    const approvedCost = budget?.approvedCostCr || 5000;
    const currentProg = progress?.physicalProgressPct || 50;
    const plannedProg = progress?.plannedProgressPct || 50;
    const exp = expenditure?.currentExpenditureCr || 2500;

    if (prediction) {
      prediction.evCr = Math.round(approvedCost * (currentProg / 100));
      prediction.pvCr = Math.round(approvedCost * (plannedProg / 100));
      prediction.acCr = exp;
      prediction.cpi = exp > 0 ? Number((prediction.evCr / exp).toFixed(2)) : 1.0;
      prediction.spi = prediction.pvCr > 0 ? Number((prediction.evCr / prediction.pvCr).toFixed(2)) : 1.0;
      prediction.costVarianceCr = prediction.evCr - prediction.acCr;
      prediction.scheduleVarianceCr = prediction.evCr - prediction.pvCr;
      
      const delayMos = Math.max(0, Math.round((plannedProg - currentProg) * 0.4));
      prediction.predictedTimeDelayMonths = delayMos;
      prediction.timeDelayProbabilityPct = Math.min(95, delayMos * 8 + 20);
      
      const overrun = prediction.cpi < 1.0 ? Math.round(approvedCost * (1 / prediction.cpi - 1)) : 0;
      prediction.predictedCostOverrunCr = overrun;
      prediction.predictedFinalCostCr = approvedCost + overrun;
      prediction.costOverrunProbabilityPct = Math.min(95, overrun > 0 ? 70 : 15);
      prediction.computedAt = new Date().toISOString();
    }

    // Recalculate Risk Assessment
    const risk = this.riskAssessments.get(projectId);
    if (risk && progress && prediction) {
      const gap = progress.progressGapPct;
      let score = 40;
      if (gap > 15) score += 30;
      else if (gap > 8) score += 18;
      
      if (prediction.cpi < 0.85) score += 20;
      else if (prediction.cpi < 0.95) score += 10;
      
      risk.overallRiskScore = Math.min(99, Math.max(10, score));
      risk.riskLevel = risk.overallRiskScore >= 75 ? 'CRITICAL' : risk.overallRiskScore >= 55 ? 'HIGH' : risk.overallRiskScore >= 35 ? 'MEDIUM' : 'LOW';
      risk.costRiskScore = Math.min(99, Math.round(prediction.costOverrunProbabilityPct));
      risk.scheduleRiskScore = Math.min(99, Math.round(prediction.timeDelayProbabilityPct));
      risk.progressRiskScore = Math.min(99, Math.max(15, Math.round(gap * 4)));
      risk.assessedAt = new Date().toISOString();
    }

    this.createAuditLog({
      entityName: 'Project',
      entityId: projectId,
      action: 'OFFICIAL_INGESTION_UPDATE',
      performedBy: 'Official Ingestion Pipeline',
      userRole: 'System',
      details: `Project ${project.code} synchronized with official source: Physical ${progress?.physicalProgressPct}%, Spend ₹${expenditure?.currentExpenditureCr} Cr.`
    });
  }

  /**
   * Insert a newly discovered official project into the unified database
   */
  public insertNewOfficialProject(record: any): string {
    const id = `prj-official-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const code = record.projectCode || `PRJ-NEW-${Date.now().toString().slice(-4)}`;

    // Resolve or match sector
    let sectorId = 'sec-1';
    for (const [sId, sec] of this.sectors.entries()) {
      if (sec.name.toLowerCase().includes((record.sector || '').toLowerCase())) {
        sectorId = sId;
        break;
      }
    }

    // Resolve or match agency
    let agencyId = 'agn-1';
    for (const [aId, agn] of this.agencies.entries()) {
      if (agn.name.toLowerCase().includes((record.agency || '').toLowerCase()) || agn.code === record.agency) {
        agencyId = aId;
        break;
      }
    }

    const locationId = 'loc-1';

    const project: ProjectEntity = {
      id,
      code,
      ocmsId: record.ocmsId || code.replace(/[^0-9]/g, '').slice(0, 4) || '1999',
      name: record.name || 'Central Infrastructure Project',
      sectorId,
      agencyId,
      locationId,
      status: 'MODERATE_DELAY',
      contractType: (record.contractType as any) || 'EPC',
      contractor: record.contractor || 'Major Infrastructure EPC Contractor',
      lengthOrCapacity: record.lengthOrCapacity || 'Standard Capacity Scope',
      description: `Official Central Sector infrastructure project monitored under MoSPI-IPMD/PAIMANA guidelines.`,
      startDate: record.startDate || '2022-01-01',
      originalCompletionDate: record.originalCompletionDate || '2025-12-31',
      revisedCompletionDate: record.revisedCompletionDate || '2026-12-31',
      currentCompletionEstimate: record.revisedCompletionDate || '2026-12-31',
      nodalOfficerName: record.nodalOfficerName || 'Shri S. K. Verma',
      nodalOfficerDesignation: record.nodalOfficerDesignation || 'Chief Project Manager',
      nodalOfficerEmail: record.nodalOfficerEmail || 'nodal.cpm@gov.in',
      nodalOfficerPhone: record.nodalOfficerPhone || '+91-11-2338-0000',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.projects.set(id, project);

    const approvedCost = record.approvedCostCr || 5000;
    const revisedCost = record.revisedCostCr || approvedCost;
    const exp = record.cumulativeExpenditureCr || 2000;
    const actualProg = record.actualPhysicalProgressPct || 40;
    const plannedProg = record.plannedPhysicalProgressPct || 50;

    this.budgets.set(id, {
      id: `bgt-${id}`,
      projectId: id,
      approvedCostCr: approvedCost,
      revisedCostCr: revisedCost,
      contingencyReserveCr: Math.round(approvedCost * 0.05),
      sanctionedDate: project.startDate
    });

    this.expenditures.set(id, {
      id: `exp-${id}`,
      projectId: id,
      currentExpenditureCr: exp,
      committedExpenditureCr: Math.round(exp * 0.4),
      fyQuarter: 'Q4-FY2026',
      lastPaymentDate: new Date().toISOString().slice(0, 10),
      auditedBy: 'CAG / MoSPI IPMD',
      lastAuditedAt: new Date().toISOString().slice(0, 10)
    });

    this.progresses.set(id, {
      id: `prg-${id}`,
      projectId: id,
      physicalProgressPct: actualProg,
      plannedProgressPct: plannedProg,
      financialProgressPct: approvedCost > 0 ? Number(((exp / approvedCost) * 100).toFixed(1)) : 0,
      progressGapPct: Number((plannedProg - actualProg).toFixed(1)),
      asOfDate: new Date().toISOString().slice(0, 10),
      reportingOfficer: project.nodalOfficerName,
      verificationMethod: 'OFFICIAL_DATA_INGESTION'
    });

    const ev = Math.round(approvedCost * (actualProg / 100));
    const pv = Math.round(approvedCost * (plannedProg / 100));
    const cpi = exp > 0 ? Number((ev / exp).toFixed(2)) : 1.0;
    const spi = pv > 0 ? Number((ev / pv).toFixed(2)) : 1.0;
    const delayMos = Math.max(0, Math.round((plannedProg - actualProg) * 0.4));

    this.predictions.set(id, {
      id: `pred-${id}`,
      projectId: id,
      predictedCompletionDate: project.revisedCompletionDate,
      predictedTimeDelayMonths: delayMos,
      timeDelayProbabilityPct: Math.min(90, delayMos * 7 + 25),
      predictedFinalCostCr: revisedCost,
      predictedCostOverrunCr: Math.max(0, revisedCost - approvedCost),
      costOverrunProbabilityPct: revisedCost > approvedCost ? 75 : 20,
      cpi,
      spi,
      pvCr: pv,
      evCr: ev,
      acCr: exp,
      costVarianceCr: ev - exp,
      scheduleVarianceCr: ev - pv,
      modelVersion: 'MoSPI-Authoritative-EVM-v1',
      computedAt: new Date().toISOString()
    });

    this.riskAssessments.set(id, {
      id: `risk-${id}`,
      projectId: id,
      overallRiskScore: 55,
      costRiskScore: 50,
      scheduleRiskScore: 60,
      progressRiskScore: 55,
      milestoneRiskScore: 50,
      financialRiskScore: 50,
      riskLevel: 'MEDIUM',
      confidenceScorePct: 95,
      explainabilityFactors: [],
      assessedAt: new Date().toISOString()
    });

    this.milestones.set(id, [
      {
        id: `ms-${id}-1`,
        projectId: id,
        name: 'Detailed Project Report & Initial Clearances',
        category: 'CLEARANCE',
        weightagePct: 15,
        originalTargetDate: '2023-06-30',
        predictedCompletionDate: '2023-06-30',
        actualCompletionDate: '2023-06-30',
        status: 'COMPLETED',
        isCriticalPath: true,
        delayDays: 0
      },
      {
        id: `ms-${id}-2`,
        projectId: id,
        name: 'Major Civil Construction & Foundation Works',
        category: 'CIVIL_WORKS',
        weightagePct: 50,
        originalTargetDate: '2025-12-31',
        revisedTargetDate: '2026-06-30',
        predictedCompletionDate: '2026-06-30',
        status: 'DELAYED',
        isCriticalPath: true,
        delayDays: 60
      },
      {
        id: `ms-${id}-3`,
        projectId: id,
        name: 'System Integration & Final Commissioning',
        category: 'COMMISSIONING',
        weightagePct: 35,
        originalTargetDate: '2026-12-31',
        predictedCompletionDate: '2026-12-31',
        status: 'ON_TRACK',
        isCriticalPath: true,
        delayDays: 0
      }
    ]);

    this.createAuditLog({
      entityName: 'Project',
      entityId: id,
      action: 'OFFICIAL_PROJECT_INSERTED',
      performedBy: 'Official Ingestion Pipeline',
      userRole: 'System',
      details: `New official project ${code} (${project.name}) ingested into unified repository.`
    });

    return id;
  }
}

// Export singleton instance of database
export const db = new RelationalDatabase();
