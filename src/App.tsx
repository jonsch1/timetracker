import React, { useState, useEffect } from "react";
import { PieChart, Pie, ResponsiveContainer, Tooltip, Cell } from "recharts";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
} from "@/components/ui/dialog"; // Assuming you have a Dialog component
import "@/index.css";

interface Activity {
  name: string;
  duration: number;
  startTime: Date;
  formattedStartTime?: string;
}

interface DayData {
  date: string;
  activities: Activity[];
}

const COLORS: string[] = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82ca9d",
];

const formatDuration = (minutes: number): string => {
  if (minutes < 1) return `${Math.round(minutes * 60)} sec`;
  return `${Math.round(minutes)} min`;
};

const formatTime = (date: Date): string => {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  const formattedHours = hours % 12 || 12;
  const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
  return `${formattedHours}:${formattedMinutes} ${ampm}`;
};

const getBadgeColor = (
  activityName: string,
  possibleActivities: string[]
): string => {
  const index = possibleActivities.indexOf(activityName);
  return COLORS[index % COLORS.length];
};

const App: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [possibleActivities, setPossibleActivities] = useState<string[]>([]);
  const [currentActivity, setCurrentActivity] = useState<string>("");
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [inputValue, setInputValue] = useState<string>("");
  const [showForm, setShowForm] = useState<boolean>(false);
  const [days, setDays] = useState<DayData[]>([]);
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [showWarningDialog, setShowWarningDialog] = useState<boolean>(false);

  useEffect(() => {
    const storedDays = localStorage.getItem("timeTrackerDays");
    const storedPossibleActivities = localStorage.getItem("possibleActivities");
    const storedCurrentActivity = localStorage.getItem("currentActivity");
    const storedStartTime = localStorage.getItem("startTime");

    if (storedDays) {
      const parsedDays = JSON.parse(storedDays).map((day: DayData) => ({
        ...day,
        activities: day.activities.map((activity: any) => ({
          ...activity,
          startTime: new Date(activity.startTime),
          formattedStartTime: formatTime(new Date(activity.startTime)),
        })),
      }));
      setDays(parsedDays);
      setSelectedDay(parsedDays[parsedDays.length - 1].date);
      setActivities(parsedDays[parsedDays.length - 1].activities);
    } else {
      const today = new Date().toISOString().split("T")[0];
      setDays([{ date: today, activities: [] }]);
      setSelectedDay(today);
    }

    if (storedPossibleActivities)
      setPossibleActivities(JSON.parse(storedPossibleActivities));
    if (storedCurrentActivity) setCurrentActivity(storedCurrentActivity);
    if (storedStartTime) setStartTime(new Date(storedStartTime));
  }, []);

  useEffect(() => {
    if (days.length > 0)
      localStorage.setItem("timeTrackerDays", JSON.stringify(days));
  }, [days]);

  useEffect(() => {
    if (activities.length > 0)
      localStorage.setItem("timeTrackerActivities", JSON.stringify(activities));
  }, [activities]);

  useEffect(() => {
    if (possibleActivities.length > 0)
      localStorage.setItem(
        "possibleActivities",
        JSON.stringify(possibleActivities)
      );
  }, [possibleActivities]);

  useEffect(() => {
    localStorage.setItem("currentActivity", currentActivity);
  }, [currentActivity]);

  useEffect(() => {
    if (startTime) localStorage.setItem("startTime", startTime.toISOString());
  }, [startTime]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (startTime && currentActivity) {
        const now = new Date();
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set to the start of the day
        const selectedDayStart = new Date(selectedDay);
        selectedDayStart.setHours(0, 0, 0, 0); // Set to the start of the selected day

        if (selectedDayStart.getTime() === today.getTime()) {
          const duration = (now.getTime() - startTime.getTime()) / 1000 / 60;
          setActivities((prev) => {
            const updatedActivities = [
              ...prev.filter(
                (a) =>
                  a.name !== currentActivity ||
                  a.startTime.getTime() !== startTime.getTime()
              ),
              {
                name: currentActivity,
                duration,
                startTime: startTime,
                formattedStartTime: formatTime(startTime),
              },
            ];
            updateDayActivities(selectedDay, updatedActivities);
            return updatedActivities;
          });
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, currentActivity, selectedDay]);

  const updateDayActivities = (date: string, updatedActivities: Activity[]) => {
    setDays((prevDays) =>
      prevDays.map((day) =>
        day.date === date ? { ...day, activities: updatedActivities } : day
      )
    );
  };

  const handleActivitySubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (inputValue && !possibleActivities.includes(inputValue)) {
      setPossibleActivities((prev) => [...prev, inputValue]);
      setInputValue("");
      setShowForm(false);
    }
  };

  const handleActivityClick = (activity: string) => {
    const now = new Date();
    const currentDateString = now.toISOString().split("T")[0];

    // Automatically switch back to the current day if starting an activity while viewing another day
    if (selectedDay !== currentDateString) {
      setSelectedDay(currentDateString);
      setActivities(
        days.find((day) => day.date === currentDateString)?.activities || []
      );
    }

    if (startTime && currentActivity) {
      const duration = (now.getTime() - startTime.getTime()) / 1000 / 60;
      setActivities((prev) => {
        const updatedActivities = [...prev];
        const existingActivityIndex = updatedActivities.findIndex(
          (a) =>
            a.name === currentActivity &&
            a.startTime.getTime() === startTime.getTime()
        );

        if (existingActivityIndex !== -1) {
          updatedActivities[existingActivityIndex].duration += duration;
        } else {
          updatedActivities.push({
            name: currentActivity,
            duration,
            startTime: startTime,
            formattedStartTime: formatTime(startTime),
          });
        }

        updateDayActivities(selectedDay, updatedActivities);
        return updatedActivities;
      });
      if (activity === currentActivity) {
        setCurrentActivity("");
        setStartTime(null);
        return;
      }
    }
    setCurrentActivity(activity);
    setStartTime(now);
  };

  const handleDaySelect = (date: string) => {
    setSelectedDay(date);
    const selectedDayData = days.find((day) => day.date === date);
    if (selectedDayData) {
      setActivities(selectedDayData.activities);
    }
  };

  const handleStartNewDay = () => {
    const currentDateString = new Date().toISOString().split("T")[0];
    const currentDayData = days.find((day) => day.date === currentDateString);
    if (currentDayData && currentDayData.activities.length > 0) {
      setShowWarningDialog(true);
    } else {
      startNewDay();
    }
  };

  const startNewDay = () => {
    if (currentActivity) {
      handleActivityClick(""); // End the current activity
    }
    const newDay = new Date();
    const newDayString = newDay.toISOString().split("T")[0];
    if (!days.some((day) => day.date === newDayString)) {
      setDays((prevDays) => [
        ...prevDays,
        { date: newDayString, activities: [] },
      ]);
    }
    setSelectedDay(newDayString);
    setActivities([]);
    setCurrentActivity("");
    setStartTime(null);
    setShowWarningDialog(false); // Close the dialog after starting a new day
  };

  const totalMinutes = activities.reduce(
    (sum, activity) => sum + activity.duration,
    0
  );

  const chartData = activities.reduce((acc, activity) => {
    const existingActivity = acc.find((a) => a.name === activity.name);
    if (existingActivity) {
      existingActivity.duration += activity.duration;
    } else {
      acc.push({
        ...activity,
        percentage: (activity.duration / totalMinutes) * 100,
      });
    }
    return acc;
  }, [] as (Activity & { percentage: number })[]);

  const handleDownload = () => {
    const storedData = localStorage.getItem("timeTrackerDays");
    if (!storedData) {
      console.error("No data found in localStorage");
      return;
    }

    const blob = new Blob([storedData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `all_activities.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderTimeline = () => {
    if (activities.length === 0) return null;

    const sortedActivities = [...activities].sort(
      (a, b) => a.startTime.getTime() - b.startTime.getTime()
    );
    const startHour = Math.floor(sortedActivities[0].startTime.getHours());
    const endHour = Math.ceil(
      sortedActivities[sortedActivities.length - 1].startTime.getHours() +
        sortedActivities[sortedActivities.length - 1].duration / 60
    );

    const uniqueActivities = sortedActivities.reduce(
      (acc: Activity[], current) => {
        const key = `${current.name}-${current.startTime.getTime()}`;
        if (
          !acc.some(
            (item) => `${item.name}-${item.startTime.getTime()}` === key
          )
        ) {
          acc.push(current);
        }
        return acc;
      },
      []
    );

    const formatHour = (hour: number) => {
      const period = hour >= 12 ? "PM" : "AM";
      const formattedHour = hour % 12 || 12;
      return `${formattedHour} ${period}`;
    };

    const isActivityInHour = (activity: Activity, hour: number) => {
      const activityStartHour = activity.startTime.getHours();
      return activityStartHour === hour;
    };

    const hoursWithActivities = new Set(
      uniqueActivities.map((activity) => activity.startTime.getHours())
    );

    return (
      <div className="relative h-96 overflow-y-auto pr-4">
        <div className="absolute top-0 bottom-0 left-16 w-px bg-gray-300"></div>
        {Array.from(
          { length: endHour - startHour + 1 },
          (_, i) => startHour + i
        )
          .filter((hour) => hoursWithActivities.has(hour))
          .map((hour) => (
            <div key={hour} className="flex items-start mb-4">
              <span className="w-16 text-right pr-4 text-sm text-gray-500">
                {formatHour(hour)}
              </span>
              <div className="flex-grow pl-4">
                {uniqueActivities
                  .filter((activity) => isActivityInHour(activity, hour))
                  .map((activity) => (
                    <div
                      key={`${activity.name}-${activity.startTime.getTime()}`}
                      className="mb-2 p-2 rounded"
                      style={{
                        backgroundColor: getBadgeColor(
                          activity.name,
                          possibleActivities
                        ),
                        opacity: 0.8,
                      }}
                    >
                      <span className="font-semibold text-white">
                        {activity.name}
                      </span>
                      <span className="ml-2 text-sm text-white">
                        ({formatTime(activity.startTime)} -{" "}
                        {formatDuration(activity.duration)})
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          ))}
      </div>
    );
  };
  const getColorForWord = (index: number) => COLORS[index % COLORS.length];

  const text = "Where does your time go?";

  return (
    <div className="bg-gray-100">
      <div className="p-8 max-w-4xl mx-auto min-h-screen">
        <Card className="mb-8 shadow-lg bg-gray-50 rounded-lg">
          <CardHeader className="text-xl font-semibold pb-4">
            <div className="flex justify-between items-center">
              <span>
                {text.split(" ").map((word, index) => (
                  <span key={index} style={{ color: getColorForWord(index) }}>
                    {word}{" "}
                  </span>
                ))}
              </span>{" "}
              <div className="flex items-center space-x-4">
                <Select value={selectedDay} onValueChange={handleDaySelect}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select a day" />
                  </SelectTrigger>
                  <SelectContent>
                    {days.map((day) => (
                      <SelectItem key={day.date} value={day.date}>
                        {day.date}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleStartNewDay}
                  className="bg-blue-500 text-white hover:bg-blue-600"
                >
                  Start New Day
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              {possibleActivities.map((activity, index) => (
                <Badge
                  key={index}
                  className="cursor-pointer text-white px-3 py-1 rounded-full"
                  style={{
                    borderColor: getBadgeColor(activity, possibleActivities),
                    backgroundColor: getBadgeColor(
                      activity,
                      possibleActivities
                    ),
                  }}
                  onClick={() => handleActivityClick(activity)}
                >
                  {activity}
                  {activity === currentActivity && (
                    <span className="ml-2 blinking">●</span>
                  )}
                </Badge>
              ))}
              <Button
                variant="outline"
                className="cursor-pointer border-dashed border-2 border-gray-400 text-gray-400 hover:border-gray-600 hover:text-gray-600"
                onClick={() => setShowForm(!showForm)}
              >
                +
              </Button>
            </div>
            {showForm && (
              <form
                onSubmit={handleActivitySubmit}
                className="flex space-x-4 mt-4"
              >
                <Input
                  type="text"
                  value={inputValue}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    e.stopPropagation();
                    setInputValue(e.target.value);
                  }}
                  placeholder="Enter new activity"
                  className="flex-grow border border-gray-300 rounded-lg px-3 py-2"
                />
                <Button
                  type="submit"
                  className="bg-green-500 text-white hover:bg-green-600"
                >
                  Add Activity
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="shadow-lg bg-gray-50 rounded-lg">
            <CardHeader className="text-lg font-semibold pb-4">
              Activity Chart
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="duration"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={150}
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={getBadgeColor(entry.name, possibleActivities)}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      formatDuration(value),
                      name,
                    ]}
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderRadius: "8px",
                      padding: "10px",
                      boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                    }}
                    itemStyle={{
                      color: "#333333",
                      fontWeight: "bold",
                    }}
                    labelStyle={{
                      color: "#666666",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card className="shadow-lg rounded-lg bg-gray-50">
            <CardHeader className="text-lg font-semibold pb-4">
              Activities Timeline
            </CardHeader>
            <CardContent>{renderTimeline()}</CardContent>
          </Card>
        </div>
        <div className="mt-8 text-center">
          <Button
            onClick={handleDownload}
            className="border border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white"
          >
            Download Activities
          </Button>
        </div>
        <Dialog open={showWarningDialog} onOpenChange={setShowWarningDialog}>
          <DialogContent className="bg-white rounded-lg shadow-lg p-6">
            <DialogHeader>
              <h2 className="text-xl font-semibold">Warning</h2>
            </DialogHeader>
            <p className="mt-4">
              There is already data recorded for today. Are you sure you want to
              reset the day? This will delete all current activities.
            </p>
            <DialogFooter className="mt-6 flex justify-end space-x-4">
              <Button
                onClick={startNewDay}
                className="bg-red-500 text-white hover:bg-red-600"
              >
                Yes, Start New Day
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowWarningDialog(false)}
                className="border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-800"
              >
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default App;
