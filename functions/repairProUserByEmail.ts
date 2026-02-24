// functions/repairProUserByEmail.ts

// Import necessary modules or types
import { User } from './userModel'; // Assuming this is a model where user info is stored
import { updateUserTier } from './userService'; // Function to update user tier

/**
 * Repair Pro tier access for users incorrectly set to Premium.
 * @param email - The email of the user whose tier needs to be repaired.
 */
export async function repairProUserByEmail(email: string): Promise<void> {
    try {
        const user = await User.findOne({ email });
        
        if (!user) {
            throw new Error(`User with email ${email} not found.`);
        }

        if (user.tier === 'Premium') {
            user.tier = 'Pro';
            await updateUserTier(user);
            console.log(`User ${email} tier successfully updated to Pro.`);
        } else {
            console.log(`User ${email} is already set to Pro tier.`);
        }
    } catch (error) {
        console.error(`Error repairing user tier: ${error.message}`);
    }
}