import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

const colorClasses = {
    blue: { bg: 'bg-blue-500', text: 'text-blue-500', light: 'bg-blue-50' },
    green: { bg: 'bg-green-500', text: 'text-green-500', light: 'bg-green-50' },
    purple: { bg: 'bg-purple-500', text: 'text-purple-500', light: 'bg-purple-50' },
    orange: { bg: 'bg-orange-500', text: 'text-orange-500', light: 'bg-orange-50' },
    red: { bg: 'bg-red-500', text: 'text-red-500', light: 'bg-red-50' },
};

export default function StatCard({ title, value, icon: Icon, color = 'blue', subtitle }) {
    const colors = colorClasses[color];

    return (
        <motion.div

            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}

        >
            <Card className="shadow-lg border-0 hover:shadow-xl transition-shadow duration-300">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
                            <p className={`text-3xl font-bold ${colors.text}`}>{value}</p>
                            {subtitle && (
                                <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
                            )}
                        </div>
                        <div className={`w-14 h-14 ${colors.light} rounded-xl flex items-center justify-center`}>
                            <Icon className={`w-7 h-7 ${colors.text}`} />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}