import NextAuth, { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_ID!,
      clientSecret: process.env.GOOGLE_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        const email = user.email;
        
        // Check if email is from allowed domain
        if (!email?.endsWith('@citchennai.net')) {
          return false;
        }

        try {
          await connectDB();
          
          // Check if user exists
          let existingUser = await User.findOne({ email });
          
          if (!existingUser) {
            // Create new user
            const isAdmin = email === 'ravikrishnaj25@gmail.com';
            
            existingUser = await User.create({
              name: user.name,
              email: user.email,
              image: user.image,
              role: isAdmin ? 'admin' : 'employee',
              designation: 'Not Set',
              department: 'Not Set',
              contactNumber: '',
              joiningDate: new Date(),
              isActive: true,
            });
          }
          
          return true;
        } catch (error) {
          console.error('Error during sign in:', error);
          return false;
        }
      }
      
      return false;
    },
    async jwt({ token, user }) {
      if (user) {
        try {
          await connectDB();
          const dbUser = await User.findOne({ email: user.email });
          if (dbUser) {
            token.role = dbUser.role;
            token.id = dbUser._id.toString();
          }
        } catch (error) {
          console.error('Error fetching user role:', error);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);