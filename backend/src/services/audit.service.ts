import { prisma } from '../config/database';

export class AuditService {
  static async findAll(filters: {
    page?: number;
    limit?: number;
    action?: string;
    entityType?: string;
    adminId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const { page = 1, limit = 20, action, entityType, adminId, startDate, endDate } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (action) {
      where.action = action;
    }

    if (entityType) {
      where.entityType = entityType;
    }

    if (adminId) {
      where.adminId = adminId;
    }

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) {
        where.timestamp.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.timestamp.lte = end;
      }
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        include: {
          admin: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { timestamp: 'desc' }
      }),
      prisma.auditLog.count({ where })
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async getAuditStats() {
    const actionCounts = await prisma.auditLog.groupBy({
      by: ['action'],
      _count: { action: true },
      orderBy: { _count: { action: 'desc' } }
    });

    return actionCounts.map((item) => ({
      action: item.action,
      count: item._count.action
    }));
  }
}
