import { PrismaService } from '../../core/prisma/prisma.service';
export declare class AnimalController {
    private prisma;
    constructor(prisma: PrismaService);
    getAll(status?: string, species?: string): Promise<any>;
    getStats(): Promise<{
        total: any;
        healthy: any;
        pregnant: any;
        sick: any;
    }>;
    getOne(id: string): Promise<any>;
    create(body: any): Promise<any>;
    update(id: string, body: any): Promise<any>;
    remove(id: string): Promise<{
        message: string;
    }>;
    addVaccination(animalId: string, body: any): Promise<any>;
    addWeight(animalId: string, body: any): Promise<any>;
    addFeed(animalId: string, body: any): Promise<any>;
    addTreatment(animalId: string, body: any): Promise<any>;
    addBirth(animalId: string, body: any): Promise<{
        pregnancy: any;
        offspring: any[];
    }>;
}
