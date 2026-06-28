import { AuthService } from './auth.service';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    login(body: {
        email: string;
        password: string;
    }): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: any;
            email: any;
            name: any;
            surname: any;
            twoFAEnabled: any;
            role: {
                id: any;
                name: any;
                displayName: any;
                permissions: any;
            };
        };
    }>;
    getMe(userId: string): Promise<any>;
}
