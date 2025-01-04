import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Save, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface Variable {
  key: string;
  value: string;
  description: string;
}

const Variables = () => {
  const { toast } = useToast();
  const [variables, setVariables] = useState<Variable[]>([
    {
      key: "WELCOME_MESSAGE",
      value: "¡Bienvenido a nuestro bot!",
      description: "Mensaje de bienvenida para nuevos usuarios",
    },
    {
      key: "MAX_MESSAGES",
      value: "100",
      description: "Número máximo de mensajes por usuario",
    },
  ]);

  const [newVariable, setNewVariable] = useState<Variable>({
    key: "",
    value: "",
    description: "",
  });

  const handleAddVariable = () => {
    if (!newVariable.key || !newVariable.value) {
      toast({
        title: "Error",
        description: "La clave y el valor son obligatorios",
        variant: "destructive",
      });
      return;
    }

    setVariables([...variables, newVariable]);
    setNewVariable({ key: "", value: "", description: "" });
    toast({
      title: "Variable añadida",
      description: "La variable se ha añadido correctamente",
    });
  };

  const handleDeleteVariable = (key: string) => {
    setVariables(variables.filter((v) => v.key !== key));
    toast({
      title: "Variable eliminada",
      description: "La variable se ha eliminado correctamente",
    });
  };

  const handleSaveChanges = () => {
    // Here you would typically save to your backend
    toast({
      title: "Cambios guardados",
      description: "Los cambios se han guardado correctamente",
    });
  };

  return (
    <DashboardLayout currentPage="/variables">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Variables</h2>
            <p className="text-gray-500">
              Gestiona las variables de configuración de tu bot
            </p>
          </div>
          <Button onClick={handleSaveChanges} className="gap-2">
            <Save className="h-4 w-4" />
            Guardar cambios
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Añadir nueva variable</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  placeholder="Clave (ej: WELCOME_MESSAGE)"
                  value={newVariable.key}
                  onChange={(e) =>
                    setNewVariable({ ...newVariable, key: e.target.value })
                  }
                />
                <Input
                  placeholder="Valor"
                  value={newVariable.value}
                  onChange={(e) =>
                    setNewVariable({ ...newVariable, value: e.target.value })
                  }
                />
              </div>
              <Textarea
                placeholder="Descripción (opcional)"
                value={newVariable.description}
                onChange={(e) =>
                  setNewVariable({ ...newVariable, description: e.target.value })
                }
              />
              <Button onClick={handleAddVariable} className="w-full gap-2">
                <Plus className="h-4 w-4" />
                Añadir variable
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {variables.map((variable) => (
            <Card key={variable.key}>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="font-medium">{variable.key}</div>
                    <Input
                      value={variable.value}
                      onChange={(e) => {
                        const newVariables = variables.map((v) =>
                          v.key === variable.key
                            ? { ...v, value: e.target.value }
                            : v
                        );
                        setVariables(newVariables);
                      }}
                    />
                    {variable.description && (
                      <p className="text-sm text-gray-500">
                        {variable.description}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => handleDeleteVariable(variable.key)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Variables;