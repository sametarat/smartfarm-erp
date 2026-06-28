import { PrismaService } from '../../core/prisma/prisma.service';
export declare class FarmController {
    private prisma;
    constructor(prisma: PrismaService);
    getZones(): Promise<any>;
    createZone(body: any): Promise<any>;
    getCrops(status?: string, zoneId?: string): Promise<any>;
    getCropStats(): Promise<{
        total: any;
        growing: any;
        harvested: any;
        totalHarvestKg: any;
    }>;
    createCrop(body: any): Promise<any>;
    updateCrop(id: string, body: any): Promise<any>;
    deleteCrop(id: string): Promise<{
        message: string;
    }>;
    addHarvest(cropId: string, body: any): Promise<any>;
    addIrrigation(cropId: string, body: any): Promise<any>;
    addFertilization(cropId: string, body: any): Promise<any>;
}
